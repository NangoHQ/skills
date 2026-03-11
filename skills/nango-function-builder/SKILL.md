---
name: nango-function-builder
description: Builds Nango Functions (TypeScript createAction/createSync) with checkpoint-first sync patterns, action and sync references, project/root checks, deletion strategies, and a docs-aligned dryrun/test workflow. Use when creating or updating Nango actions or syncs.
---

# Nango Function Builder
Build deployable Nango functions (actions and syncs) with repeatable patterns and validation steps.

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

## Workflow (recommended)
1. Decide whether this is an action or a sync.
2. Read the matching reference file: `references/actions.md` or `references/syncs.md`.
3. For syncs, inspect the provider docs or sample payloads for a checkpointable path first (`updated_at`, `modified_since`, changed-records endpoints, deleted-record endpoints, cursors, page tokens, offset/page, `since_id`, or webhooks), decide whether it returns the full dataset or only changed rows, and complete the Sync Strategy Gate before writing code.
4. Gather required inputs and external values. If you need connection details, credentials, or discovery calls, use the Nango HTTP API (Connections/Proxy; auth with the Nango secret key). Do not invent Nango CLI token/connection commands.
5. Verify this is a Zero YAML TypeScript project (no `nango.yaml`) and you are in the Nango root (`.nango/` exists).
6. Create or update the function under `{integrationId}/actions/` or `{integrationId}/syncs/`, then register it in `index.ts`.
7. Validate with `nango dryrun ... --validate -e dev --no-interactive --auto-confirm`.
8. If validation cannot pass, stop and return early with the missing external state or inputs required.
9. After validation passes, run `nango dryrun ... --save`, then `nango generate:tests`, then `npm test`.
10. Deploy with `nango deploy dev` only when the task calls for deployment.

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
- Frequency (every hour, every 5 minutes, etc.)
- Checkpoint schema (timestamp, cursor, page token, offset/page, `since_id`, or composite)
- How the checkpoint changes the provider request or resume state
- Delete strategy (deleted-record endpoint/webhook, or why full refresh is required)
- If proposing a full refresh, the exact provider limitation that blocks checkpoints from the docs/sample response
- Metadata JSON if required (team_id, workspace_id)

If any required external values are missing, ask a targeted question after checking the repo and provider docs. For syncs, choose a checkpoint plus deletion strategy whenever the provider supports one. If you cannot find a viable checkpoint strategy, state exactly why before writing a full refresh.

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
- Never combine `trackDeletesStart()` / `trackDeletesEnd()` with a changed-only checkpoint request (`modified_after`, `updated_after`, changed-records endpoint, etc.). Those requests return only changed rows, so `trackDeletesEnd()` would delete every unchanged row that was omitted from the response.
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

## Dryrun, Mocks, and Tests (required)

Required loop (do not skip steps):
1. Run `nango dryrun ... --validate -e dev --no-interactive --auto-confirm` until it passes.
2. Actions: always pass `--input '{...}'` (use `--input '{}'` for no-input actions).
3. Syncs: use `--checkpoint '{...}'` when you need to simulate a resumed run.
4. If validation cannot pass, stop and state the missing external state or inputs required.
5. After validation passes, run `nango dryrun ... --save -e dev --no-interactive --auto-confirm` to generate `<script-name>.test.json`.
6. Run `nango generate:tests`, then `npm test`.

Hard rules:
- Treat `<script-name>.test.json` as generated output. Never create, edit, rename, or move it (including recorded `hash` fields).
- If mocks are wrong or stale, fix the code and re-record with `--save`.
- Do not hard-code error payloads in `*.test.json`; use a Vitest test with `vi.spyOn(...)` for 404/401/429/timeout cases.
- Connection ID is the second positional argument; do not use `--connection-id`.
- Use `--integration-id <integration-id>` when script names overlap across integrations.
- Prefer `--checkpoint` for new incremental syncs; `--lastSyncDate` is a legacy pattern.
- If `nango` is not on PATH, use `npx nango ...`.
- CLI upgrade prompts can block automation; set `NANGO_CLI_UPGRADE_MODE=ignore` if needed.

Reference: https://nango.dev/docs/implementation-guides/platform/functions/testing

## References

- Action patterns, CRUD examples, metadata usage, and ActionError examples: `references/actions.md`
- Sync patterns, concrete checkpoint examples, delete strategies, and full refresh fallback: `references/syncs.md`

## Useful Nango docs (quick links)
- Functions runtime SDK reference: https://nango.dev/docs/reference/functions
- Implement an action: https://nango.dev/docs/implementation-guides/use-cases/actions/implement-an-action
- Implement a sync: https://nango.dev/docs/implementation-guides/use-cases/syncs/implement-a-sync
- Checkpoints: https://nango.dev/docs/implementation-guides/use-cases/syncs/checkpoints
- Deletion detection (full vs incremental): https://nango.dev/docs/implementation-guides/use-cases/syncs/deletion-detection
- Testing integrations (dryrun, --save, Vitest): https://nango.dev/docs/implementation-guides/platform/functions/testing
- Nango HTTP API reference: https://nango.dev/docs/reference/api

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
- Run dryrun with `--validate` until it passes, then run dryrun with `--save`, then `nango generate:tests`

## Final Checklists

Action:
- [ ] Nango root verified
- [ ] `references/actions.md` was used for the action pattern
- [ ] Schemas and types are clear (inline or relative imports)
- [ ] `createAction()` includes endpoint, input, output, and scopes when required
- [ ] Provider call includes an API doc link comment and intentional retries
- [ ] `nango.ActionError` is used for expected failures
- [ ] Registered in index.ts
- [ ] Dryrun succeeds with `--validate -e dev --no-interactive --auto-confirm --input '{...}'`
- [ ] `<action-name>.test.json` was generated by `nango dryrun ... --save` after `--validate`
- [ ] `nango generate:tests` ran and `npm test` passes

Sync:
- [ ] Nango root verified
- [ ] `references/syncs.md` was used for the sync pattern
- [ ] Models map is defined and record ids are stable strings
- [ ] Incremental strategy was chosen first and a `checkpoint` schema is defined unless full refresh fallback is explicitly justified from provider docs/sample responses
- [ ] `nango.getCheckpoint()` is read at the start and `nango.saveCheckpoint()` is used after each processed batch/page
- [ ] Checkpoint data changes the provider request or resume state (`since`, `updated_after`, `cursor`, `page_token`, `offset`, `page`, `since_id`, etc.)
- [ ] Changed-only checkpoint syncs (`modified_after`, `updated_after`, changed-records endpoint) do not use `trackDeletesStart()` / `trackDeletesEnd()`
- [ ] If checkpoints were not used, the response explains exactly why no viable checkpoint strategy exists
- [ ] List sync logic uses `nango.paginate()` plus `nango.batchSave()` unless the API shape requires a manual loop
- [ ] Deletion strategy matches the sync type: `batchDelete()` for incremental only when the provider returns explicit deletions; otherwise full-refresh fallback uses `trackDeletesStart()` before fetch/save and `trackDeletesEnd()` only after a successful full fetch plus save
- [ ] Metadata handled if required
- [ ] Registered in index.ts
- [ ] Dryrun succeeds with `--validate -e dev --no-interactive --auto-confirm`
- [ ] `<sync-name>.test.json` was generated by `nango dryrun ... --save` after `--validate`
- [ ] `nango generate:tests` ran and `npm test` passes
