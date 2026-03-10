## Sync Template (createSync)

```typescript
import { createSync } from 'nango';
import { z } from 'zod';

const RecordSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    updated_at: z.string()
});

const CheckpointSchema = z.object({
    updated_after: z.string().optional()
});

const sync = createSync({
    description: 'Brief single sentence',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/provider/records', group: 'Records' }],
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,

    models: {
        Record: RecordSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint<z.infer<typeof CheckpointSchema>>();
        // Sync logic here
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
```

### Choose the Sync Strategy First

- Start with checkpoint-based incremental syncs.
- Treat checkpoints as required unless the provider docs prove there is no practical way to fetch only changes or resume safely.
- Use checkpoints when the API supports `updated_at` / `modified_since` filters, changed-records endpoints, cursors/page tokens, or webhooks that let you resume safely.
- If you fall back to full refresh, explicitly explain the blocking API limitation (for example no change filter/feed, no deleted-record feed, no resumable cursor/page token, or only full-list endpoints). "Full refresh is simpler" is not a valid reason.
- Save progress with `nango.saveCheckpoint()` after each processed page/batch.
- Fall back to full refresh only when the provider cannot return changed records or deletions, or the dataset is trivially small.

### Sync Deletion Detection

- Do not use `trackDeletes: true`. It is deprecated.
- Incremental syncs: if the API exposes deleted records, tombstones, or webhook delete events, call `batchDelete()`.
- Full refresh fallback (including checkpoint-based full refresh): call `trackDeletesStart` before fetching, and `trackDeletesEnd` after all batching record calls (`batchSave`/`batchUpdate`/`batchDelete`).
- Checkpointed full refreshes are still full refreshes. If you checkpoint pagination state to resume a long backfill, only call `trackDeletesEnd` in the execution that finishes saving the complete dataset.

Important: deletion detection is a soft delete. Records remain in the cache but are marked as deleted in metadata.

Safety: only call `trackDeletesEnd` when the run successfully fetched + saved the full dataset between `trackDeletesStart` and `trackDeletesEnd`. Do not catch and swallow errors and still call it (false deletions).

Reference: https://nango.dev/docs/implementation-guides/use-cases/syncs/deletion-detection

### Incremental Sync With Checkpoints (Recommended)

```typescript
const CheckpointSchema = z.object({
    updated_after: z.string().optional()
});

const sync = createSync({
    checkpoint: CheckpointSchema,
    frequency: 'every 5 minutes',

    models: {
        Record: RecordSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint<z.infer<typeof CheckpointSchema>>();

        const proxyConfig = {
            // https://api-docs-url
            endpoint: '/api/records',
            params: {
                sort: 'updated_at:asc',
                ...(checkpoint?.updated_after && { since: checkpoint.updated_after })
            },
            paginate: { limit: 100 },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const records = batch.map((record: { id: string; name?: string; updated_at: string }) => ({
                id: record.id,
                name: record.name ?? null,
                updated_at: record.updated_at
            }));

            if (records.length === 0) {
                continue;
            }

            await nango.batchSave(records, 'Record');
            await nango.saveCheckpoint({
                updated_after: records[records.length - 1].updated_at
            });
        }

        if (checkpoint?.updated_after) {
            const deleted = await nango.get({
                // https://api-docs-url
                endpoint: '/api/records/deleted',
                params: { since: checkpoint.updated_after },
                retries: 3
            });

            if (deleted.data.length > 0) {
                await nango.batchDelete(
                    deleted.data.map((record: { id: string }) => ({ id: record.id })),
                    'Record'
                );
            }
        }
    }
});
```

If the provider can return identical timestamps or requires pagination state to resume safely, use a composite checkpoint such as `z.object({ updated_after: z.string(), cursor: z.string().optional() })` and persist both fields with `nango.saveCheckpoint()`.

### Full Refresh Sync (Fallback Only)

Use this only when the provider cannot filter by changes, expose deleted records, or provide a practical checkpoint strategy. When you choose this path, explicitly state which API limitation blocked checkpoints. For long backfills, you can checkpoint pagination state, but it is still a full refresh and `trackDeletesEnd()` must only run after the complete dataset is saved.

```typescript
const sync = createSync({
    frequency: 'every hour',

    models: {
        Record: RecordSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('Record');

        const proxyConfig = {
            // https://api-docs-url
            endpoint: '/api/v1/records',
            paginate: { limit: 100 },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const records = batch.map((record: { id: string; name?: string; updated_at: string }) => ({
                id: record.id,
                name: record.name ?? null,
                updated_at: record.updated_at
            }));

            if (records.length > 0) {
                await nango.batchSave(records, 'Record');
            }
        }

        await nango.trackDeletesEnd('Record');
    }
});
```

### Sync Metadata (When Required)

```typescript
const MetadataSchema = z.object({
    team_id: z.string()
});

const sync = createSync({
    metadata: MetadataSchema,

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const teamId = metadata?.team_id;

        if (!teamId) {
            throw new Error('team_id is required in metadata.');
        }

        const response = await nango.get({
            // https://api-docs-url
            endpoint: `/v1/teams/${teamId}/projects`,
            retries: 3
        });
    }
});
```

Note: nango.getMetadata() is cached for up to 60 seconds during a sync execution. Metadata updates may not be visible until the next run.

### Realtime Syncs (Webhooks)

Use webhookSubscriptions + onWebhook when the provider supports webhooks.

```typescript
const sync = createSync({
    webhookSubscriptions: ['contact.propertyChange'],

    exec: async (nango) => {
        // Optional periodic polling
    },

    onWebhook: async (nango, payload) => {
        if (payload.subscriptionType === 'contact.propertyChange') {
            const updated = {
                id: payload.objectId,
                [payload.propertyName]: payload.propertyValue
            };
            await nango.batchSave([updated], 'Contact');
        }
    }
});
```

Optional merge strategy:

```typescript
await nango.setMergingStrategy({ strategy: 'ignore_if_modified_after' }, 'Contact');
```

### Key SDK Methods (Sync)

| Method | Purpose |
|--------|---------|
| nango.getCheckpoint() | Read the last saved incremental progress |
| nango.saveCheckpoint(checkpoint) | Persist progress after each processed batch/page |
| nango.paginate(config) | Iterate through paginated responses |
| nango.batchSave(records, model) | Save records to cache |
| nango.batchDelete(records, model) | Mark as deleted (incremental) |
| nango.trackDeletesStart(model) | Start automated deletion detection (full refresh fallback) |
| nango.trackDeletesEnd(model) | Mark missing records as deleted (full refresh fallback) |

### Pagination Helper (Advanced Config)

Nango preconfigures pagination for some APIs. Override when needed.

For incremental syncs, pair pagination with checkpoints and call `nango.saveCheckpoint()` inside the loop after each processed page/batch.

Pagination types: cursor, link, offset.

```typescript
const proxyConfig = {
    endpoint: '/tickets',
    paginate: {
        type: 'cursor',
        cursor_path_in_response: 'next',
        cursor_name_in_request: 'cursor',
        response_path: 'tickets',
        limit_name_in_request: 'limit',
        limit: 100
    },
    retries: 3
};

for await (const page of nango.paginate(proxyConfig)) {
    await nango.batchSave(page, 'Ticket');
}
```

Link pagination uses link_rel_in_response_header or link_path_in_response_body. Offset pagination uses offset_name_in_request.

### Manual Cursor-Based Pagination (If Needed)

```typescript
const checkpoint = await nango.getCheckpoint<{ cursor?: string }>();
let cursor: string | undefined = checkpoint?.cursor;

while (true) {
    const res = await nango.get({
        endpoint: '/api',
        params: { cursor },
        retries: 3
    });
    const records = res.data.items.map((item: { id: string; name?: string; updated_at: string }) => ({
        id: item.id,
        name: item.name ?? null,
        updated_at: item.updated_at
    }));
    await nango.batchSave(records, 'Record');
    cursor = res.data.next_cursor;
    await nango.saveCheckpoint({ cursor });
    if (!cursor) break;
}
```
