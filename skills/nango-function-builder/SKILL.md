---
name: nango-function-builder
description: Build Nango Functions (TypeScript createAction/createSync) using the Nango Runner SDK. Includes project/root checks, endpoint conventions, retries/pagination, deletion detection, metadata, and a docs-aligned dryrun/test workflow.
---

# Nango Function Builder
Build deployable Nango functions (actions and syncs) with repeatable patterns and validation steps.

## When to use
- User wants to build or modify a Nango function
- User wants to build an action in Nango
- User wants to build a sync in Nango

## Useful Nango docs (quick links)
- Functions runtime SDK reference: https://nango.dev/docs/reference/functions
- Implement an action: https://nango.dev/docs/implementation-guides/use-cases/actions/implement-an-action
- Implement a sync: https://nango.dev/docs/implementation-guides/use-cases/syncs/implement-a-sync
- Testing integrations (dryrun, --save, Vitest): https://nango.dev/docs/implementation-guides/platform/functions/testing
- Deletion detection (full vs incremental): https://nango.dev/docs/implementation-guides/use-cases/syncs/deletion-detection

## Workflow (recommended)
1. Decide whether this is an action or a sync.
2. Gather required inputs (integration id, connection id, script name, and API docs/sample responses; actions: test input JSON).
3. Verify this is a Zero YAML TypeScript project (no `nango.yaml`) and you are in the Nango root (`.nango/` exists).
4. Compile as needed with `nango compile` (one-off).
5. Create/update the function file under `{integrationId}/actions/` or `{integrationId}/syncs/`.
6. Register the file in `index.ts` (side-effect import).
7. Validate with `nango dryrun ... --validate -e dev --no-interactive --auto-confirm` (actions: never omit `--input '{...}'`; use `--input '{}'` for no-input actions).
8. If validation can't pass, stop and return early stating the missing external state/inputs required (never hand-author `*.test.json`).
9. Ensure `<script-name>.test.json` exists by running `nango dryrun ... --save -e dev --no-interactive --auto-confirm` (actions: always include `--input '{...}'`).
10. Generate tests with `nango generate:tests` (required) and run `npm test`.
11. Deploy with `nango deploy dev`.

## Decide: Action vs Sync

Action:
- One-time request, user-triggered
- CRUD operations and small lookups
- Thin API wrapper

Sync:
- Continuous data sync on a schedule
- Fetches all records or incremental changes
- Uses batchSave/batchDelete

## Required Inputs (Ask User if Missing)

Always:
- Integration ID (provider name)
- Connection ID (for dryrun)
- Script name (kebab-case)
- API reference URL or sample response

Action-specific:
- Use case summary
- Input parameters
- Output fields
- Metadata JSON if required
- Test input JSON for dryrun `--input` and mocks (required; use `{}` for no-input actions)

Sync-specific:
- Model name (singular, PascalCase)
- Sync type (full or incremental)
- Frequency (every hour, every 5 minutes, etc.)
- Metadata JSON if required (team_id, workspace_id)

If any of these are missing, ask the user for them before writing code. Use their values in dryrun commands and tests.

### Prompt Templates (Use When Details Are Missing)

Action prompt:

```
Please provide:
Integration ID (required):
Connection ID (required):
Use Case Summary:
Action Inputs:
Action Outputs:
Metadata JSON (if required):
Action Name (kebab-case):
API Reference URL:
Test Input JSON (required):
```

Sync prompt:

```
Please provide:
Integration ID (required):
Connection ID (required):
Sync Name (kebab-case):
Model Name (singular, PascalCase):
Endpoint Path (for Nango endpoint):
Frequency (every hour, every 5 minutes, etc.):
Sync Type (full or incremental):
Metadata JSON (if required):
API Reference URL:
```

## Preconditions (Do Before Writing Code)

### Confirm TypeScript Project (No nango.yaml)

This skill only supports TypeScript projects using createAction()/createSync().

```bash
ls nango.yaml 2>/dev/null && echo "YAML PROJECT DETECTED" || echo "OK - No nango.yaml"
```

If you see YAML PROJECT DETECTED:
- Stop immediately.
- Tell the user to upgrade to the TypeScript format first.
- Do not attempt to mix YAML and TypeScript.

Reference: https://nango.dev/docs/implementation-guides/platform/migrations/migrate-to-zero-yaml

### Verify Nango Project Root

Do not create files until you confirm the Nango root:

```bash
ls -la .nango/ 2>/dev/null && pwd && echo "IN NANGO PROJECT ROOT" || echo "NOT in Nango root"
```

If you see NOT in Nango root:
- cd into the directory that contains .nango/
- Re-run the check
- Do not use absolute paths as a workaround

All file paths must be relative to the Nango root. Creating files with extra prefixes while already in the Nango root will create nested directories that break the build.

## Project Structure and Naming

```
./
|-- .nango/
|-- index.ts
|-- hubspot/
|   |-- actions/
|   |   `-- create-contact.ts
|   `-- syncs/
|       `-- fetch-contacts.ts
`-- slack/
    `-- actions/
        `-- post-message.ts
```

- Provider directories: lowercase (hubspot, slack)
- Action files: kebab-case (create-contact.ts)
- Sync files: kebab-case (many teams use a `fetch-` prefix, but it's optional)
- One function per file (action or sync)
- All actions and syncs must be imported in index.ts

### Register scripts in `index.ts` (required)

Use side-effect imports only (no default/named imports). Include the `.js` extension.

```typescript
// index.ts
import './github/actions/get-top-contributor.js';
import './github/syncs/fetch-issues.js';
```

Symptom of incorrect registration: the file compiles but you see `No entry points found in index.ts...` or the function never appears.

## Non-Negotiable Rules (Shared)

### Platform constraints (docs-backed)

- Zero YAML TypeScript projects do not use `nango.yaml`. Define functions with `createAction()` or `createSync()`.
- Register every action/sync in `index.ts` via side-effect import (`import './<path>.js'`) or it will not load.
- You cannot install/import arbitrary third-party packages in Functions. Relative imports inside the Nango project are supported. Pre-included dependencies include `zod`, `crypto`/`node:crypto`, and `url`/`node:url`.
- Sync records must include a stable string `id`.
- Action outputs cannot exceed 2MB.
- `deleteRecordsFromPreviousExecutions()` is for full refresh syncs only. Call it only after you successfully fetched + saved the full dataset; do not swallow errors and still call it.
- HTTP request retries default to `0`. Set `retries` intentionally (and be careful retrying non-idempotent writes).

### Dryrun + tests (hard rules)

- Default dryruns to `-e dev --no-interactive --auto-confirm` (agents commonly run in non-interactive contexts).
- Actions: never omit `--input` in `nango dryrun` (use `--input '{}'` for empty input).
- Never hand-author `*.test.json`. It must be generated by `nango dryrun <script-name> <connection-id> --save` after a successful `--validate`. If dryrun can't pass, return early stating the missing external state/inputs (e.g., connection id, required metadata, required scopes/permissions, or a sample response).
- After `--save`, run `nango generate:tests` (required) to generate/update `<script-name>.test.ts`.

### Conventions (recommended)

- Prefer explicit parameter names (`user_id`, `channel_id`, `team_id`).
- Add `.describe()` examples for IDs, timestamps, enums, and URLs.
- Avoid `any`; use inline types when mapping responses.
- Prefer static Nango endpoint paths (avoid `:id` / `{id}` in the exposed endpoint); pass IDs in input/params.
- Add an API doc link comment above each provider API call.
- Standardize list actions on `cursor`/`next_cursor`.
- For optional outputs, return `null` only when the output schema models `null`.
- Use `nango.zodValidateInput()` when you need custom input validation/logging; otherwise rely on schemas + `nango dryrun --validate`.
- Zod: `z.object()` strips unknown keys by default. For provider payload pass-through use `z.object({}).passthrough()`, `z.record(z.unknown())`, or `z.unknown()` with minimal refinements.

### Parameter Naming Rules

- IDs: suffix with _id (user_id, channel_id)
- Names: suffix with _name (channel_name)
- Emails: suffix with _email (user_email)
- URLs: suffix with _url (callback_url)
- Timestamps: use *_at or *_time (created_at, scheduled_time)

Mapping example (API expects a different parameter name):

```typescript
const InputSchema = z.object({
    user_id: z.string()
});

const config: ProxyConfiguration = {
    endpoint: 'users.info',
    params: {
        user: input.user_id
    },
    retries: 3
};
```

## Dryrun, Mocks, and Tests (required)

Required loop (do not skip steps):
1. `nango dryrun ... --validate -e dev --no-interactive --auto-confirm` until it passes (actions: never omit `--input`).
2. If validation can't pass, stop and return early stating the missing external state/inputs required (never hand-author `*.test.json`).
3. After validation passes, run `nango dryrun ... --save -e dev --no-interactive --auto-confirm` to generate `<script-name>.test.json`.
4. Run `nango generate:tests` to generate/update `<script-name>.test.ts`.
5. Run `npm test`.

Default non-interactive flags (use these unless you have a reason not to):
- `-e dev --no-interactive --auto-confirm`

### nango dryrun

Basic syntax:

```
nango dryrun <script-name> <connection-id> [flags]
```

Actions (always pass `--input`):

Validate:

```
nango dryrun <action-name> <connection-id> --validate -e dev --no-interactive --auto-confirm --input '{"key":"value"}'

# For no-input actions (input: z.object({}))
nango dryrun <action-name> <connection-id> --validate -e dev --no-interactive --auto-confirm --input '{}'
```

After validation passes, record mocks (generates `<action-name>.test.json`):

```
nango dryrun <action-name> <connection-id> --save -e dev --no-interactive --auto-confirm --input '{"key":"value"}'
```

Syncs:

Validate:

```
nango dryrun <sync-name> <connection-id> --validate -e dev --no-interactive --auto-confirm
```

After validation passes, record mocks (generates `<sync-name>.test.json`):

```
nango dryrun <sync-name> <connection-id> --save -e dev --no-interactive --auto-confirm
```

Incremental sync testing:

```
nango dryrun <sync-name> <connection-id> --validate -e dev --no-interactive --auto-confirm --lastSyncDate "YYYY-MM-DD"
```

Stub metadata (when your function calls nango.getMetadata()):

```
# Action (still requires --input)
nango dryrun <action-name> <connection-id> --validate -e dev --no-interactive --auto-confirm --input '{}' --metadata '{"team_id":"123"}'

# Sync
nango dryrun <sync-name> <connection-id> --validate -e dev --no-interactive --auto-confirm --metadata @fixtures/metadata.json
```

Notes:
- Connection ID is the second positional argument (no `--connection-id` flag).
- Use `--integration-id <integration-id>` when script names overlap across integrations.
- Common flags: `--variant <name>`.
- If you do not have `nango` on PATH, use `npx nango ...`.
- CLI upgrade prompts can block non-interactive runs. Workaround: set `NANGO_CLI_UPGRADE_MODE=ignore`.

### nango generate:tests

Generate/update tests (required):

```
nango generate:tests
```

Optionally narrow generation:

```
nango generate:tests -i <integrationId>
nango generate:tests -i <integrationId> -a <action-name>
nango generate:tests -i <integrationId> -s <sync-name>
```

### Test artifacts

```
{integrationId}/tests/
|-- <script-name>.test.ts
`-- <script-name>.test.json
```

- Ensure `<script-name>.test.json` exists (generated by `nango dryrun ... --save` after a successful `--validate`). Never hand-author `*.test.json`.
- `<script-name>.test.json` contains recorded API mocks + expected input/output.
- `<script-name>.test.ts` is generated/updated by `nango generate:tests`.

Reference: https://nango.dev/docs/implementation-guides/platform/functions/testing

## Action Template (createAction)

Notes:
- `input` is required even for "no input" actions. Use `z.object({})`.
- Do not import `ActionError` as a value from `nango` (it is a type-only export in recent versions). Throw `new nango.ActionError(payload)` using the `nango` exec parameter.
- `ProxyConfiguration` typing is optional. Only import it if you explicitly annotate a variable.

```typescript
import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('User ID. Example: "123"')
    // For no-input actions use: z.object({})
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'Brief single sentence',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/user',
        group: 'Users'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['required.scope'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://api-docs-url
            endpoint: '/api/v1/users',
            params: {
                userId: input.user_id
            },
            retries: 3 // safe for idempotent GETs; be careful retrying non-idempotent writes
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found',
                user_id: input.user_id
            });
        }

        return {
            id: response.data.id,
            name: response.data.name ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
```

### Action Metadata (When Required)

Use metadata when the action depends on connection-specific values.

```typescript
const MetadataSchema = z.object({
    team_id: z.string()
});

const action = createAction({
    metadata: MetadataSchema,

    exec: async (nango, input) => {
        const metadata = await nango.getMetadata<{ team_id?: string }>();
        const teamId = metadata?.team_id;

        if (!teamId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'team_id is required in metadata.'
            });
        }
    }
});
```

### Action CRUD Patterns

| Operation | Method | Config Pattern |
|-----------|--------|----------------|
| Create | nango.post(config) | data: { properties: {...} } |
| Read | nango.get(config) | endpoint: `resource/${id}`, params: {...} |
| Update | nango.patch(config) | endpoint: `resource/${id}`, data: {...} |
| Delete | nango.delete(config) | endpoint: `resource/${id}` |
| List | nango.get(config) | params: {...} with pagination |

Note: These endpoint examples are for ProxyConfiguration (provider API). The createAction endpoint path must stay static.

Recommended in most configs:
- API doc link comment above endpoint
- retries: set intentionally (often `3` for idempotent GET/LIST; avoid retries for non-idempotent POST unless the API supports idempotency)

Optional input fields pattern:

```typescript
data: {
    required_field: input.required_field,
    ...(input.optional_field && { optional_field: input.optional_field })
}
```

### Action Error Handling (ActionError)

Use ActionError for expected failures (not found, validation, rate limit). Use standard Error for unexpected failures.

```typescript
if (response.status === 429) {
    throw new nango.ActionError({
        type: 'rate_limited',
        message: 'API rate limit exceeded',
        retry_after: response.headers['retry-after']
    });
}
```

Do not return null-filled objects to indicate "not found". Use ActionError instead.

ActionError response format:

```json
{
  "error_type": "action_script_failure",
  "payload": {
    "type": "not_found",
    "message": "User not found",
    "user_id": "123"
  }
}
```

### Action Pagination Standard (List Actions)

All list actions must use cursor/next_cursor regardless of provider naming.

Schema pattern:

```typescript
const ListInput = z.object({
    cursor: z.string().optional().describe('Pagination cursor from previous response. Omit for first page.')
});

const ListOutput = z.object({
    items: z.array(ItemSchema),
    next_cursor: z.union([z.string(), z.null()])
});
```

Provider mapping:

| Provider | Native Input | Native Output | Map To |
|----------|--------------|---------------|--------|
| Slack | cursor | response_metadata.next_cursor | cursor -> next_cursor |
| Notion | start_cursor | next_cursor | cursor -> next_cursor |
| HubSpot | after | paging.next.after | cursor -> next_cursor |
| GitHub | page | Link header | cursor -> next_cursor |
| Google | pageToken | nextPageToken | cursor -> next_cursor |

Example:

```typescript
exec: async (nango, input): Promise<z.infer<typeof ListOutput>> => {
    const config: ProxyConfiguration = {
        endpoint: 'api/items',
        params: {
            ...(input.cursor && { cursor: input.cursor })
        },
        retries: 3
    };

    const response = await nango.get(config);

    return {
        items: response.data.items.map((item: { id: string; name: string }) => ({
            id: item.id,
            name: item.name
        })),
        next_cursor: response.data.next_cursor || null
    };
}
```

## Sync Template (createSync)

```typescript
import { createSync } from 'nango';
import { z } from 'zod';

const RecordSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()])
});

const sync = createSync({
    description: 'Brief single sentence',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/provider/records', group: 'Records' }],
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',

    models: {
        Record: RecordSchema
    },

    exec: async (nango) => {
        // Sync logic here
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
```

### Sync Deletion Detection

- Do not use trackDeletes. It is deprecated.
- Full syncs: call deleteRecordsFromPreviousExecutions at the end of exec after all batchSave calls.
- Incremental syncs: if the API supports it, detect deletions and call batchDelete.

Important: deletion detection is a soft delete. Records remain in the cache but are marked as deleted in metadata.

Safety: only call deleteRecordsFromPreviousExecutions when the run successfully fetched the full dataset. Do not catch and swallow errors and still call it (false deletions).

Reference: https://nango.dev/docs/implementation-guides/use-cases/syncs/deletion-detection

```typescript
await nango.deleteRecordsFromPreviousExecutions('Record');
```

### Full Sync (Recommended)

```typescript
exec: async (nango) => {
    const proxyConfig = {
        // https://api-docs-url
        endpoint: 'api/v1/records',
        paginate: { limit: 100 },
        retries: 3
    };

    for await (const batch of nango.paginate(proxyConfig)) {
        const records = batch.map((r: { id: string; name: string }) => ({
            id: r.id,
            name: r.name ?? null
        }));

        if (records.length > 0) {
            await nango.batchSave(records, 'Record');
        }
    }

    await nango.deleteRecordsFromPreviousExecutions('Record');
}
```

### Incremental Sync

```typescript
const sync = createSync({
    syncType: 'incremental',
    frequency: 'every 5 minutes',

    exec: async (nango) => {
        const lastSync = nango.lastSyncDate;

        const proxyConfig = {
            // https://api-docs-url
            endpoint: '/api/records',
            params: {
                sort: 'updated',
                ...(lastSync && { since: lastSync.toISOString() })
            },
            paginate: { limit: 100 },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const records = batch.map((record: { id: string; name?: string }) => ({
                id: record.id,
                name: record.name ?? null
            }));
            await nango.batchSave(records, 'Record');
        }

        if (lastSync) {
            const deleted = await nango.get({
                // https://api-docs-url
                endpoint: '/api/records/deleted',
                params: { since: lastSync.toISOString() },
                retries: 3
            });
            if (deleted.data.length > 0) {
                await nango.batchDelete(
                    deleted.data.map((d: { id: string }) => ({ id: d.id })),
                    'Record'
                );
            }
        }
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
| nango.paginate(config) | Iterate through paginated responses |
| nango.batchSave(records, model) | Save records to cache |
| nango.batchDelete(records, model) | Mark as deleted (incremental) |
| nango.deleteRecordsFromPreviousExecutions(model) | Auto-detect deletions (full) |
| nango.lastSyncDate | Last sync timestamp (incremental) |

### Pagination Helper (Advanced Config)

Nango preconfigures pagination for some APIs. Override when needed.

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
let cursor: string | undefined;
while (true) {
    const res = await nango.get({
        endpoint: '/api',
        params: { cursor },
        retries: 3
    });
    const records = res.data.items.map((item: { id: string; name?: string }) => ({
        id: item.id,
        name: item.name ?? null
    }));
    await nango.batchSave(records, 'Record');
    cursor = res.data.next_cursor;
    if (!cursor) break;
}
```

## Deploy (Optional)

Deploy functions to an environment in your Nango account:

```
nango deploy dev

# Deploy only one function
nango deploy --action <action-name> dev
nango deploy --sync <sync-name> dev
```

Reference: https://nango.dev/docs/implementation-guides/use-cases/actions/implement-an-action

## When API Docs Do Not Render

If web fetching returns incomplete docs (JS-rendered):
- Ask the user for a sample response
- Use existing actions/syncs in the repo as a pattern
 - Run dryrun with `--validate` until it passes, then run dryrun with `--save` to capture mocks, then run `nango generate:tests` to generate tests from the recorded response

## Common Mistakes

| Mistake | Impact | Fix |
|---------|--------|-----|
| Missing/incorrect index.ts import | Function not loaded | Add side-effect import (`import './<path>.js'`) |
| Hand-authoring `*.test.json` | Fake/brittle tests | Run `nango dryrun ... --validate` until it passes, then run `nango dryrun ... --save` to generate `<script-name>.test.json` |
| Skipping `nango generate:tests` | Missing/out-of-date `.test.ts` | Run `nango generate:tests` after `--save` |
| Action dryrun without `--input` | Validation fails / wrong mocks | Always pass `--input '{...}'` (use `'{}'` for no-input actions) |
| Dryrun without `-e dev --no-interactive --auto-confirm` | CLI prompts/hangs in automation | Use `-e dev --no-interactive --auto-confirm` (and `NANGO_CLI_UPGRADE_MODE=ignore` if needed) |
| Using legacy dryrun flags (`--save-responses`, `-m`) | Dryrun/mocks fail | Use `--save` and `--metadata` |
| Calling deleteRecordsFromPreviousExecutions after partial fetch | False deletions | Let failures fail; only call after full successful save |
| trackDeletes: true | Deprecated | Use deleteRecordsFromPreviousExecutions (full) or batchDelete (incremental) |
| Retrying non-idempotent writes blindly | Duplicate side effects | Avoid retries or use provider idempotency keys |
| Using any in mapping | Loses type safety | Use inline types |
| Using --connection-id | Dryrun fails | Use positional connection id |

## Final Checklists

Action:
- [ ] Nango root verified
- [ ] Schemas + types are clear (inline or relative imports)
- [ ] createAction with endpoint/input/output/scopes
- [ ] Proxy config includes API doc link and intentional retries
- [ ] `nango.ActionError` used for expected failures
- [ ] Registered in index.ts
- [ ] Dryrun succeeds with `--validate -e dev --no-interactive --auto-confirm --input '{...}'`
- [ ] Ensure `<action-name>.test.json` exists (generated by `nango dryrun ... --save` after `--validate`; never hand-authored)
- [ ] `nango generate:tests` ran and `npm test` passes

Sync:
- [ ] Nango root verified
- [ ] Models map defined; record ids are strings
- [ ] createSync with endpoints/frequency/syncType
- [ ] paginate + batchSave in exec
- [ ] deleteRecordsFromPreviousExecutions at end for full sync
- [ ] Metadata handled if required
- [ ] Registered in index.ts
- [ ] Dryrun succeeds with `--validate -e dev --no-interactive --auto-confirm`
- [ ] Ensure `<sync-name>.test.json` exists (generated by `nango dryrun ... --save` after `--validate`; never hand-authored)
- [ ] `nango generate:tests` ran and `npm test` passes
