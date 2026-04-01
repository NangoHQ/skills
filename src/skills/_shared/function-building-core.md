## When to use
- User wants to build or modify a Nango function
- User wants to build an action in Nango
- User wants to build a sync in Nango

## Sync Strategy Gate (required before writing code)

If the task is a sync, read `references/syncs.md` before writing code and state one of these paths first:

- Checkpoint plan:
  - change source (`updated_at`, `modified_since`, changed-records endpoint, cursor, page token, offset/page, `since_id`, or webhook)
  - checkpoint schema
  - how the checkpoint changes the provider request or resume state
  - whether the request still walks the full dataset or returns changed rows only
  - delete strategy
- Full refresh blocker:
  - exact provider limitation from the docs or sample payloads
  - why checkpoints cannot work here

Invalid sync implementations:
- full refresh because it is simpler
- `saveCheckpoint()` without `getCheckpoint()`
- reading or saving a checkpoint without using it in request params or pagination state
- using `syncType: 'incremental'` or `nango.lastSyncDate` in a new sync
- using `trackDeletesStart()` / `trackDeletesEnd()` with a changed-only checkpoint (`modified_after`, `updated_after`, changed-records endpoint). Those requests omit unchanged rows, so `trackDeletesEnd()` will falsely delete them.
- using `trackDeletesStart()` / `trackDeletesEnd()` in an incremental sync that already has explicit deleted-record events

## Choose the Path

Action:
- One-time request, user-triggered, built with `createAction()`
- Read `references/actions.md` before writing code

Sync:
- Scheduled or webhook-driven cache updates built with `createSync()`
- Complete the Sync Strategy Gate first
- Read `references/syncs.md` before writing code

## Required Inputs (Ask User if Missing)

Always:
- Integration ID (provider name)
- Connection ID (for validation or dryrun)
- Script/function name (kebab-case)
- API reference URL or sample response

Action-specific:
- Use case summary
- Input parameters
- Output fields
- Metadata JSON if required
- Test input JSON for validation/dryrun (required; use `{}` for no-input actions)

Sync-specific:
- Model name (singular, PascalCase)
- Frequency (every hour, every 5 minutes, etc.)
- Checkpoint schema (timestamp, cursor, page token, offset/page, `since_id`, or composite)
- How the checkpoint changes the provider request or resume state
- Delete strategy (deleted-record endpoint/webhook, or why full refresh is required)
- If proposing a full refresh, the exact provider limitation that blocks checkpoints from the docs/sample response
- Metadata JSON if required (team_id, workspace_id)

If any required external values are missing, ask a targeted question after checking the repo and provider docs. For syncs, choose a checkpoint plus deletion strategy whenever the provider supports one. If you cannot find a viable checkpoint strategy, state exactly why before writing a full refresh.

## Non-Negotiable Rules

### Shared platform constraints

- Nango functions use `createAction()` / `createSync()`.
- You cannot add arbitrary packages. Use relative imports only when the chosen workflow supports them; built-ins include `zod`, `crypto`/`node:crypto`, and `url`/`node:url`.
- Use the Nango HTTP API for connection lookup, credentials, and proxy calls outside function code. Do not invent CLI token or connection commands.
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
- Prefer static Nango endpoint paths (avoid `:id` / `{id}` in the exposed endpoint); pass IDs in input or params.
- List actions should expose `cursor` plus a next-cursor field in the majority casing of that API (`next_cursor`, `nextCursor`, etc.).
- Use `nango.zodValidateInput()` only when you need custom validation or logging; otherwise rely on schemas plus the chosen validation workflow.

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

## References

- Action patterns, CRUD examples, metadata usage, and ActionError examples: `references/actions.md`
- Sync patterns, concrete checkpoint examples, delete strategies, and full refresh fallback: `references/syncs.md`

## Useful Nango docs (quick links)
- Functions runtime SDK reference: https://nango.dev/docs/reference/functions
- Implement an action: https://nango.dev/docs/implementation-guides/use-cases/actions/implement-an-action
- Implement a sync: https://nango.dev/docs/implementation-guides/use-cases/syncs/implement-a-sync
- Checkpoints: https://nango.dev/docs/implementation-guides/use-cases/syncs/checkpoints
- Deletion detection (full vs incremental): https://nango.dev/docs/implementation-guides/use-cases/syncs/deletion-detection
- Testing integrations (dryrun, `--save`, Vitest): https://nango.dev/docs/implementation-guides/platform/functions/testing
- Nango HTTP API reference: https://nango.dev/docs/reference/api

## When API Docs Do Not Render

If web fetching returns incomplete docs (JS-rendered):
- Ask the user for a sample response
- Use existing Nango actions or syncs in the workspace as a pattern when they exist
- Use the skill-specific validation or dryrun workflow until it passes
