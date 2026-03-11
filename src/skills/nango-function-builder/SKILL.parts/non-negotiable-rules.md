## Non-Negotiable Rules

### Shared platform constraints

- Zero YAML TypeScript projects do not use `nango.yaml`. Define functions with `createAction()` or `createSync()`.
- Register every action/sync in `index.ts` via side-effect import (`import './<path>.js'`) or it will not load.
- You cannot install/import arbitrary third-party packages in Functions. Relative imports inside the Nango project are supported. Pre-included dependencies include `zod`, `crypto`/`node:crypto`, and `url`/`node:url`.
- Use the Nango HTTP API for connection discovery, credentials, and proxy calls outside function code. Do not invent Nango CLI token/connection commands.
- Add an API doc link comment above each provider API call.
- Action outputs cannot exceed 2MB.
- HTTP request retries default to `0`. Set `retries` intentionally (and be careful retrying non-idempotent writes).

### Sync rules

- Sync records must include a stable string `id`.
- New syncs default to checkpoints. Define a `checkpoint` schema and use `nango.getCheckpoint()` at the start plus `nango.saveCheckpoint()` after each processed batch/page.
- A checkpoint is only valid if it changes the provider request or resume state (`since`, `updated_after`, `cursor`, `page_token`, `offset`, `page`, `since_id`, etc.). Saving a checkpoint without using it is not a valid incremental sync.
- For new syncs, do not use `syncType: 'incremental'` or `nango.lastSyncDate`; checkpoints replace that pattern.
- Default list sync logic to `nango.paginate(...)` plus `nango.batchSave(...)`.
- Prefer `batchDelete()` when the provider exposes deleted records, tombstones, or delete webhooks.
- Full refresh is fallback only. Use it only when the provider cannot return changed records, deleted records, or resumable state, or when the dataset is trivially small.
- Before writing a full refresh sync, cite the exact provider limitation from the docs or sample payloads. "It is easier" is not a valid reason.
- `deleteRecordsFromPreviousExecutions()` is deprecated. For full refresh fallback, call `await nango.trackDeletesStart('<ModelName>')` before fetching/saving and `await nango.trackDeletesEnd('<ModelName>')` only after a successful full fetch plus save.
- Checkpointed full refreshes are still full refreshes. Only call `trackDeletesEnd()` in the execution that finishes the complete refresh window.

### Conventions

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
