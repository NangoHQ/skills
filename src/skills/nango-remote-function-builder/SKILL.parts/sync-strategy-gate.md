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
