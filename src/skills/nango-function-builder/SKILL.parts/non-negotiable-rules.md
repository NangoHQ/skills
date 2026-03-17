## Non-Negotiable Rules

### Shared platform constraints

- Zero YAML TypeScript projects use `createAction()` / `createSync()`, not `nango.yaml`.
- Register every action/sync in `index.ts` with side-effect imports (`import './<path>.js'`).
- You cannot add arbitrary packages. Use relative imports; built-ins include `zod`, `crypto`/`node:crypto`, and `url`/`node:url`.
- Use the Nango HTTP API for connection lookup, credentials, and proxy calls outside function code. Do not invent CLI token/connection commands.
- Add an API doc link comment above each provider call.
- Action outputs cannot exceed 2MB.
- HTTP retries default to `0`; set `retries` deliberately, especially for writes.

### Sync rules

- Sync records need a stable string `id`.
- New syncs should define a `checkpoint` schema, call `nango.getCheckpoint()` first, and `nango.saveCheckpoint()` after each page or batch.
- A checkpoint is valid only if it changes the request or resume state (`since`, `updated_after`, `cursor`, `page_token`, `offset`, `page`, `since_id`, etc.). Saving one without using it is not incremental sync.
- New syncs must not use `syncType: 'incremental'` or `nango.lastSyncDate`.
- Default to `nango.paginate(...)` + `nango.batchSave(...)`. Avoid manual `while (true)` loops when `cursor`, `link`, or `offset` pagination fits.
- Prefer `batchDelete()` when the provider returns deletions, tombstones, or delete webhooks.
- Use full refresh only if the provider cannot return changes, deletions, or resume state, or if the dataset is tiny.
- For full refresh, cite the exact provider limitation from docs or payloads. "It is easier" is not enough.
- `deleteRecordsFromPreviousExecutions()` is deprecated. For full refresh, call `trackDeletesStart()` before fetch/save and `trackDeletesEnd()` only after a successful full fetch/save.
- Never combine `trackDeletesStart()` / `trackDeletesEnd()` with changed-only checkpoints (`modified_after`, `updated_after`, changed-records endpoints, etc.). They omit unchanged rows, so `trackDeletesEnd()` would delete them.
- Checkpointed full refreshes are still full refreshes. Call `trackDeletesEnd()` only in the run that finishes the full window.

### Conventions

- Match field casing to the external API. Passthrough fields keep provider casing; non-passthrough fields should use the majority casing of that API.
- Prefer explicit field names.
- Add `.describe()` examples for IDs, timestamps, enums, and URLs.
- Avoid `any`; use inline mapping types.
- Prefer static Nango endpoint paths (avoid `:id` / `{id}` in the exposed endpoint); pass IDs in input/params.
- List actions should expose `cursor` plus a next-cursor field in the majority casing of that API (`next_cursor`, `nextCursor`, etc.).
- Use `nango.zodValidateInput()` only when you need custom validation or logging; otherwise rely on schemas + `nango dryrun --validate`.

### Schema Semantics

- Default non-required inputs to `.optional()`.
- Use `.nullable()` only when `null` has meaning, usually clear-on-update; add `.optional()` when callers may omit the field too.
- Raw provider schemas should match the provider: `.optional()` for omitted fields, `.nullable()` for explicit `null`, `.nullish()` only when the provider truly does both.
- Final action outputs and normalized sync models should prefer `.optional()` and normalize upstream `null` to omission unless `null` matters.
- Default generated schemas to `.optional()` for non-required inputs and normalized outputs; widen only when the upstream contract justifies it.
- Prefer `.nullable()` over `z.union([z.null(), T])` or `z.union([T, z.null()])`.
- Return `null` only when the output schema allows it.
- `z.object()` strips unknown keys by default. For provider pass-through use `z.object({}).passthrough()`, `z.record(z.unknown())`, or `z.unknown()` with minimal refinements.

### Field Naming and Casing Rules

- Use explicit suffixes in the API's majority casing: IDs (`user_id`, `userId`), names (`channel_name`, `channelName`), emails (`user_email`, `userEmail`), URLs (`callback_url`, `callbackUrl`), and timestamps (`created_at`, `createdAt`).

Mapping example (API expects a different parameter name):

```typescript
const InputSchema = z.object({
    userId: z.string()
});

const config: ProxyConfiguration = {
    endpoint: 'users.info',
    params: {
        user: input.userId
    },
    retries: 3
};
```

If the API is snake_case, use `user_id` instead. The goal is API consistency.
