# Syncs Reference

## Contents
- Required planning output
- Schema and casing rules
- Base template
- Pattern 1: `updated_at` / `modified_since`
- Pattern 2: changed-records feed with a cursor
- Pattern 3: `since_id` / sequence checkpoint
- Pattern 4: timestamp plus page token
- Pattern 5: timestamp plus page number or offset
- Pattern 6: `updated_at` via POST search with nested cursor pagination
- Delete strategies
- Full refresh fallback
- Metadata
- Validation and execution
- Invalid patterns

## Required planning output

Before writing a sync, state:
- change source: `updated_at`, `modified_since`, changed-records endpoint, cursor, page token, offset/page, `since_id`, or webhook
- checkpoint schema
- how the checkpoint changes the request or resume state
- delete strategy
- if full refresh is required, the exact provider limitation blocking checkpoints

Webhook note: `onWebhook` handlers usually do not checkpoint. If the sync also polls, still choose a checkpoint pattern for `exec`.

Set `retries: 3` on every provider API call in syncs unless API docs or request semantics require a lower value. Do not set sync retries above `3`; sync calls often run longer and move more data, so higher values are effectively forbidden unless API docs and the workflow prove they are safe and necessary.

## Schema and casing rules

- Raw provider schemas should match the provider: `.optional()` for omitted fields, `.nullable()` for explicit `null`, `.nullish()` only when the provider truly does both.
- Normalized models should prefer `.optional()` and normalize upstream `null` to omission unless `null` matters.
- Passthrough fields keep provider casing. Derived fields should follow the majority casing of that API.
- Prefer `.nullable()` over `z.union([z.null(), T])` or `z.union([T, z.null()])`.

```typescript
const ProviderRecordSchema = z.object({
    id: z.string(),
    name: z.string().nullable(),
    updated_at: z.string(),
    archived_at: z.string().optional()
});

const RecordSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    updated_at: z.string(),
    archived_at: z.string().optional()
});
```

## Base template

```typescript
import { createSync } from 'nango';
import { z } from 'zod';

const RecordSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    updated_at: z.string()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Brief single sentence',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Record: RecordSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        // Use checkpoint values in request params or resume state.
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
```

## Pattern 1: `updated_at` / `modified_since`

Use this when the provider can filter records changed since a timestamp.

```typescript
const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    frequency: 'every 5 minutes',
    checkpoint: CheckpointSchema,
    models: {
        Contact: RecordSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const proxyConfig = {
            // https://api-docs-url
            endpoint: '/v1/contacts',
            params: {
                sort: 'updated_at:asc',
                ...(checkpoint?.updated_after && { updated_after: checkpoint.updated_after })
            },
            paginate: { limit: 100 },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const providerRecords = z.array(ProviderRecordSchema).parse(page);
            const contacts = providerRecords.map((record) => ({
                id: record.id,
                ...(record.name != null && { name: record.name }),
                updated_at: record.updated_at
            }));

            const lastContact = contacts[contacts.length - 1];

            if (lastContact === undefined) {
                continue;
            }

            await nango.batchSave(contacts, 'Contact');
            await nango.saveCheckpoint({
                updated_after: lastContact.updated_at
            });
        }
    }
});
```

If the provider exposes a deleted-record endpoint, use the same checkpoint value there.

```typescript
const DeletedRecordsSchema = z.object({
    items: z.array(z.object({ id: z.string() }))
});

if (checkpoint?.updated_after) {
    const response = await nango.get({
        // https://api-docs-url
        endpoint: '/v1/contacts/deleted',
        params: {
            updated_after: checkpoint.updated_after
        },
        retries: 3
    });

    const deleted = DeletedRecordsSchema.parse(response.data);

    if (deleted.items.length > 0) {
        await nango.batchDelete(
            deleted.items.map((record) => ({ id: record.id })),
            'Contact'
        );
    }
}
```

## Pattern 2: changed-records feed with a cursor

Use this when the provider exposes a delta endpoint such as `/changes`, `/events`, or `/feed` and returns a cursor or token for the next page.

```typescript
import { createSync, type ProxyConfiguration } from 'nango';

const CheckpointSchema = z.object({
    cursor: z.string()
});

const ProviderChangeSchema = z.object({
    id: z.string(),
    name: z.string().nullish(),
    updated_at: z.string().optional(),
    deleted_at: z.string().optional()
});

const ChangesResponseSchema = z.object({
    cursor: z.string().optional()
});

const sync = createSync({
    frequency: 'every 5 minutes',
    checkpoint: CheckpointSchema,
    models: {
        Contact: RecordSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let cursor = checkpoint?.cursor;

        const proxyConfig: ProxyConfiguration = {
            // https://api-docs-url
            endpoint: '/v1/contacts/changes',
            params: {
                ...(cursor && { cursor })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'next_cursor',
                response_path: 'items',
                on_page: async ({ nextPageParam, response }) => {
                    cursor = ChangesResponseSchema.parse(response.data).cursor ?? (typeof nextPageParam === 'string' ? nextPageParam : undefined);
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const changes = z.array(ProviderChangeSchema).parse(page);

            const upserts = changes
                .filter((change) => !change.deleted_at)
                .map((change) => ({
                    id: change.id,
                    ...(change.name != null && { name: change.name }),
                    updated_at: change.updated_at ?? new Date().toISOString()
                }));

            const deletions = changes
                .filter((change) => Boolean(change.deleted_at))
                .map((change) => ({ id: change.id }));

            if (upserts.length > 0) {
                await nango.batchSave(upserts, 'Contact');
            }

            if (deletions.length > 0) {
                await nango.batchDelete(deletions, 'Contact');
            }

            if (cursor !== undefined) {
                await nango.saveCheckpoint({ cursor });
            }
        }
    }
});
```

If the provider returns a dedicated resume token or high-water mark instead of reusing `next_cursor`, save that field instead.

## Pattern 3: `since_id` / sequence checkpoint

Use this only when the provider guarantees a monotonic identifier or event sequence and supports filtering newer records with `since_id`, `after_id`, or an equivalent parameter.

```typescript
const CheckpointSchema = z.object({
    last_id: z.string()
});

const sync = createSync({
    frequency: 'every 5 minutes',
    checkpoint: CheckpointSchema,
    models: {
        Invoice: RecordSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const proxyConfig = {
            // https://api-docs-url
            endpoint: '/v1/invoices',
            params: {
                sort: 'id:asc',
                ...(checkpoint?.last_id && { since_id: checkpoint.last_id })
            },
            paginate: { limit: 100 },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const providerRecords = z.array(ProviderRecordSchema).parse(page);
            const invoices = providerRecords.map((record) => ({
                id: record.id,
                ...(record.name != null && { name: record.name }),
                updated_at: record.updated_at
            }));

            const lastInvoice = invoices[invoices.length - 1];

            if (lastInvoice === undefined) {
                continue;
            }

            await nango.batchSave(invoices, 'Invoice');
            await nango.saveCheckpoint({
                last_id: lastInvoice.id
            });
        }
    }
});
```

## Pattern 4: timestamp plus page token

Use a composite checkpoint when the provider filters by time but also requires a page token or cursor to resume safely within the same window.

```typescript
import { createSync, type ProxyConfiguration } from 'nango';

const CheckpointSchema = z.object({
    updated_after: z.string(),
    page_token: z.string()
});

const sync = createSync({
    frequency: 'every 5 minutes',
    checkpoint: CheckpointSchema,
    models: {
        Task: RecordSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let updatedAfter = checkpoint?.updated_after;
        let pageToken = checkpoint?.page_token;

        const proxyConfig: ProxyConfiguration = {
            // https://api-docs-url
            endpoint: '/v1/tasks',
            params: {
                sort: 'updated_at:asc',
                ...(updatedAfter && { updated_after: updatedAfter }),
                ...(pageToken && { page_token: pageToken })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'page_token',
                cursor_path_in_response: 'next_page_token',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    pageToken = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const providerRecords = z.array(ProviderRecordSchema).parse(page);
            const tasks = providerRecords.map((record) => ({
                id: record.id,
                ...(record.name != null && { name: record.name }),
                updated_at: record.updated_at
            }));

            const lastTask = tasks[tasks.length - 1];

            if (lastTask === undefined) {
                continue;
            }

            await nango.batchSave(tasks, 'Task');

            if (pageToken) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter ?? '',
                    page_token: pageToken
                });
                continue;
            }

            updatedAfter = lastTask.updated_at;
            await nango.saveCheckpoint({ updated_after: updatedAfter, page_token: '' });
        }
    }
});
```

Use this same pattern when the provider can return identical timestamps and you need extra pagination state to avoid skipping or replaying records.

## Pattern 5: timestamp plus page number or offset

Use a composite checkpoint when the provider filters by time but paginates with `page`, `offset`, or `start` instead of a token.

```typescript
import { createSync, type ProxyConfiguration } from 'nango';

const CheckpointSchema = z.object({
    updated_after: z.string(),
    page: z.number().int().positive()
});

const sync = createSync({
    frequency: 'every 5 minutes',
    checkpoint: CheckpointSchema,
    models: {
        Lead: RecordSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let updatedAfter = checkpoint?.updated_after;
        let page: number | undefined = checkpoint?.page ?? 1;
        let lastProcessedUpdatedAt: string | undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://api-docs-url
            endpoint: '/v1/leads',
            params: {
                sort: 'updated_at:asc',
                ...(updatedAfter && { modified_since: updatedAfter })
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page ?? 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'items',
                on_page: async ({ nextPageParam }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const providerRecords = z.array(ProviderRecordSchema).parse(pageResults);
            const leads = providerRecords.map((record) => ({
                id: record.id,
                ...(record.name != null && { name: record.name }),
                updated_at: record.updated_at
            }));

            const lastLead = leads[leads.length - 1];

            if (lastLead === undefined) {
                if (page === undefined && lastProcessedUpdatedAt) {
                    await nango.saveCheckpoint({
                        updated_after: lastProcessedUpdatedAt,
                        page: 1
                    });
                }
                continue;
            }

            await nango.batchSave(leads, 'Lead');
            lastProcessedUpdatedAt = lastLead.updated_at;

            if (page !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter ?? '',
                    page
                });
                continue;
            }

            updatedAfter = lastProcessedUpdatedAt;
            await nango.saveCheckpoint({
                updated_after: updatedAfter,
                page: 1
            });
        }
    }
});
```

## Pattern 6: `updated_at` via POST search with nested cursor pagination

Use this when the provider exposes the `updated_at` filter through a POST search endpoint and cursor pagination is returned in a nested body field (e.g., `pagination.starting_after`).

`nango.paginate` with `method: 'POST'` automatically sends pagination params in the request body (`passPaginationParamsInBody` defaults to `true` for POST/PUT/PATCH). Use dot-path notation in `cursor_name_in_request` — the runtime uses lodash `set()` to write the cursor into the correct nested location. A top-level key like `'starting_after'` would land at the body root and be ignored by the provider.

```typescript
import { createSync, type ProxyConfiguration } from 'nango';

const CheckpointSchema = z.object({
    updated_after: z.number()
});

const ProviderContactSchema = z.object({
    id: z.string(),
    updated_at: z.number()
});

const sync = createSync({
    frequency: 'every hour',
    checkpoint: CheckpointSchema,
    models: {
        Contact: RecordSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after ?? Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60;

        // cursor_name_in_request uses dot-path so lodash set() writes the cursor into
        // body.pagination.starting_after, not at the top-level body key.
        const proxyConfig: ProxyConfiguration = {
            // https://api-docs-url
            endpoint: '/v1/contacts/search',
            method: 'POST',
            data: {
                query: {
                    operator: 'AND',
                    value: [{ field: 'updated_at', operator: '>', value: updatedAfter }]
                },
                pagination: { per_page: 150 }
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'pagination.starting_after',
                cursor_path_in_response: 'pages.next.starting_after',
                response_path: 'data',
                limit_name_in_request: 'per_page',
                limit: 150
            },
            retries: 3
        };

        let maxUpdatedAt: number | undefined;

        for await (const page of nango.paginate(proxyConfig)) {
            const contacts = z.array(ProviderContactSchema).parse(page);

            if (contacts.length > 0) {
                await nango.batchSave(contacts, 'Contact');

                for (const contact of contacts) {
                    if (maxUpdatedAt === undefined || contact.updated_at > maxUpdatedAt) {
                        maxUpdatedAt = contact.updated_at;
                    }
                }
            }
        }

        if (maxUpdatedAt !== undefined) {
            await nango.saveCheckpoint({ updated_after: maxUpdatedAt });
        }
    }
});
```

Checkpoint is saved once after all pages are consumed because the `updated_at` filter is baked into the request body at the start — mid-run checkpointing here would not change the request for an in-progress run.

## Delete strategies

Incremental syncs should usually delete with explicit provider data, not full refresh deletion detection.

Deleted-record endpoint:

```typescript
const DeletedRecordsSchema = z.object({
    items: z.array(z.object({ id: z.string() }))
});

const response = await nango.get({
    // https://api-docs-url
    endpoint: '/v1/tasks/deleted',
    params: {
        ...(checkpoint?.updated_after && { updated_after: checkpoint.updated_after })
    },
    retries: 3
});

const deleted = DeletedRecordsSchema.parse(response.data);

if (deleted.items.length > 0) {
    await nango.batchDelete(
        deleted.items.map((record) => ({ id: record.id })),
        'Task'
    );
}
```

Deleted flag in the change feed:

```typescript
const deletions = changes
    .filter((change) => Boolean(change.deleted_at))
    .map((change) => ({ id: change.id }));

if (deletions.length > 0) {
    await nango.batchDelete(deletions, 'Task');
}
```

## Full refresh fallback

Use full refresh only when the provider truly cannot return changes, deletions, or resumable state. State the blocker explicitly before using this pattern.

Full refresh syncs still need a `checkpoint` schema. Nango syncs run inside an execution window with a time limit. If a full refresh does not finish within that window and has no checkpoint, the next run restarts from page one, re-fetching the same early pages every time and never reaching the rest of the dataset. Always:

- Read the checkpoint first. Call `trackDeletesStart()` on every execution — after any metadata or input validation, but before the fetch loop. It is safe to call repeatedly; it will not overwrite the start of a delete-tracking window that a prior execution of the same logical refresh already opened. (If validation fails and returns early before this call, `trackDeletesEnd()` will never run, leaving delete tracking unclosed.)
- Start pagination from the saved checkpoint when one exists.
- Call `saveCheckpoint()` with the next page/cursor after every `batchSave()`, including the last page. Never guard the save with "more pages remain" or defer it until the end of `exec`.
- Call `clearCheckpoint()` once, only after the last page has been saved. Saving every processed page guarantees that a checkpoint row exists to clear, including when the full dataset fits on the first page. If an execution path creates no checkpoint at all (for example, it processes no pages), do not call `clearCheckpoint()` on that path; it throws `checkpoint_conflict` at runtime. This is not a substitute for saving the last page.
- Call `trackDeletesEnd()` only after `clearCheckpoint()`, so it fires exactly once, in the execution that actually finished walking the full dataset.

Never reuse this pattern on a changed-only endpoint (`modified_after`, `updated_after`, changed-records feed, etc.). Those endpoints omit unchanged rows, so `trackDeletesEnd()` would treat unchanged records as deleted.

```typescript
import { createSync, type ProxyConfiguration } from 'nango';

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    frequency: 'every hour',
    checkpoint: CheckpointSchema,
    models: {
        Record: RecordSchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes /v1/records with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor.
        const checkpoint = await nango.getCheckpoint();
        let page: number | undefined = checkpoint?.page ?? 1;

        // Safe to call every execution: trackDeletesStart() will not overwrite the
        // start of a delete-tracking window this refresh already opened.
        await nango.trackDeletesStart('Record');

        const proxyConfig: ProxyConfiguration = {
            // https://api-docs-url
            endpoint: '/v1/records',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'items',
                on_page: async ({ nextPageParam }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const providerRecords = z.array(ProviderRecordSchema).parse(pageResults);
            const records = providerRecords.map((record) => ({
                id: record.id,
                ...(record.name != null && { name: record.name }),
                updated_at: record.updated_at
            }));

            if (records.length > 0) {
                await nango.batchSave(records, 'Record');
            }

            // Save pagination progress after every page, including the last one.
            // Without this, a run that exceeds the execution window restarts from
            // page 1 next time instead of resuming where it left off.
            await nango.saveCheckpoint({ page: page ?? 1 });
        }

        // Every page, including the last, was checkpointed. Clear only after the
        // terminal page is saved, then close the delete-tracking window.
        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Record');
    }
});
```

## Metadata

Use metadata when the sync depends on connection-specific values such as `team_id`, `workspace_id`, or `guild_id` that the caller must supply before the sync can run.

**When metadata is required, always set `autoStart: false`.** The sync cannot execute correctly until the caller has set the metadata — auto-starting it would fail immediately.

```typescript
const MetadataSchema = z.object({
    team_id: z.string()
});

const sync = createSync({
    description: 'Brief single sentence',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,   // required when metadata is needed
    metadata: MetadataSchema,
    models: { Record: RecordSchema },

    exec: async (nango) => {
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();

        if (!metadata?.team_id) {
            throw new Error('team_id is required in metadata');
        }

        // use metadata.team_id in requests
    }
});
```

## Validation and execution

Validation, dryrun, mock recording, and deployment are workflow-specific. Use the active skill's workflow instructions for those steps. This shared reference only defines implementation patterns.

## Invalid patterns

Bad example: the checkpoint is read and saved, but it never changes the provider request.

```typescript
const checkpoint = await nango.getCheckpoint();

const response = await nango.get({
    endpoint: '/v1/contacts',
    retries: 3
});

await nango.batchSave(response.data.items, 'Contact');
await nango.saveCheckpoint({
    updated_after: new Date().toISOString()
});
```

Why this is invalid:
- the next run still fetches the full dataset
- failures cannot resume from the saved state
- delete handling is disconnected from the saved progress

The checkpoint must change the request or resume state.

Bad example: a changed-only checkpoint is combined with `trackDeletesStart()` / `trackDeletesEnd()`.

```typescript
const checkpoint = await nango.getCheckpoint();

await nango.trackDeletesStart('Contact');

const response = await nango.get({
    endpoint: '/v1/contacts',
    params: checkpoint?.modified_after ? { modified_after: checkpoint.modified_after } : {},
    retries: 3
});

await nango.batchSave(response.data.items, 'Contact');
await nango.saveCheckpoint({
    modified_after: new Date().toISOString()
});
await nango.trackDeletesEnd('Contact');
```

Why this is invalid:
- the endpoint returns only changed contacts
- unchanged contacts are absent from this execution
- `trackDeletesEnd()` will delete those unchanged contacts as if they disappeared at the provider

Bad example: a full refresh with no checkpoint.

```typescript
await nango.trackDeletesStart('Record');

for await (const page of nango.paginate(proxyConfig)) {
    const records = page.map(mapRecord);
    await nango.batchSave(records, 'Record');
}

await nango.trackDeletesEnd('Record');
```

Why this is invalid:
- a run that exceeds the execution window loses all pagination progress
- the next run restarts from page 1, wasting compute re-fetching the same early pages
- later pages may never be reached, and each run's `trackDeletesEnd()` then falsely deletes the records on those unreached pages

Bad example: `saveCheckpoint()` is guarded by "more pages remain," so it never runs when the whole dataset fits on one page.

```typescript
let offset = (await nango.getCheckpoint())?.offset ?? 0;
const limit = 100;
let hasMore = true;

await nango.trackDeletesStart('Record');

while (hasMore) {
    const response = await nango.get({
        endpoint: '/v1/records',
        params: { limit, offset },
        retries: 3
    });

    await nango.batchSave(response.data.items.map(mapRecord), 'Record');

    if (response.data.items.length < limit) {
        hasMore = false;
    } else {
        offset += limit;
        await nango.saveCheckpoint({ offset });
    }
}

await nango.trackDeletesEnd('Record');
await nango.clearCheckpoint();
```

Why this is invalid:

- `saveCheckpoint()` only runs in the `else` branch, when another page remains
- whenever the full result set fits in a single page (a small connection, or any run after the dataset shrinks below `limit`), that branch never executes and no checkpoint row is ever written
- the unconditional `clearCheckpoint()` then tries to delete a checkpoint that does not exist; `clearCheckpoint()` is optimistic-locked, so a delete matching zero rows fails with `checkpoint_conflict` ("Checkpoint has been updated since last read") — indistinguishable from a genuine concurrent-write conflict, even though nothing raced
- fix by saving the checkpoint on every page including the last (`await nango.saveCheckpoint({ offset })` unconditionally, right before evaluating `hasMore`)
