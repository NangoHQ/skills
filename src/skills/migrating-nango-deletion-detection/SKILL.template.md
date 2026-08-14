---
name: migrating-nango-deletion-detection
description: Migrates Nango syncs from deleteRecordsFromPreviousExecutions()/trackDeletes to trackDeletesStart/trackDeletesEnd for automated deletion detection (including checkpoint-based full refresh). Use when updating existing createSync code.
---

# Migrating Nango Deletion Detection

## Do this

1. Find legacy usage:
   - `deleteRecordsFromPreviousExecutions(`
   - `trackDeletes:` / `track_deletes`
2. For each sync + model that needs automatic deletion detection:
   - Add `await nango.trackDeletesStart('ModelName')` at the start of `exec` (before fetching/saving).
   - Replace `await nango.deleteRecordsFromPreviousExecutions('ModelName')` with `await nango.trackDeletesEnd('ModelName')`.
   - Keep `trackDeletesEnd` after all `batchSave`/`batchUpdate`/`batchDelete` calls.
3. Safety:
   - Only call `trackDeletesEnd` if the full dataset was fetched + saved between `trackDeletesStart` and `trackDeletesEnd` (otherwise you can cause false deletions).
   - Prefer letting exceptions bubble. If you `catch`, re-throw when data is incomplete.

## Checkpointed full refresh (multi-execution)

Full refresh syncs need a pagination `checkpoint` (page/cursor/offset) in addition to delete tracking. Nango syncs run inside a time-limited execution window; without a checkpoint, a run that does not finish in that window restarts from page 1 next time, wasting compute re-fetching the same early pages and never reaching the rest of the dataset.

- Read the checkpoint first (`await nango.getCheckpoint()`), and resume pagination from it when present.
- Call `trackDeletesStart('ModelName')` at the beginning of every execution in the refresh window. It is safe to call repeatedly — it will not overwrite the start of a delete-tracking window that a prior execution of the same logical refresh already opened.
- After each successful `batchSave()`, call `saveCheckpoint()` with the next page/cursor.
- Call `clearCheckpoint()` only after the last page is saved.
- Call `trackDeletesEnd('ModelName')` only after that `clearCheckpoint()` — i.e. only in the execution that finishes saving the full dataset.

## Tests

- Re-record mocks after code changes:
  - `nango dryrun <sync-name> <connection-id> --validate -e dev --no-interactive --auto-confirm`
  - `nango dryrun <sync-name> <connection-id> --save -e dev --no-interactive --auto-confirm`
  - `nango generate:tests && npm test`
- Never hand-edit `*.test.json`.

## Before/after

```ts
// Before
for await (const page of nango.paginate(cfg)) {
  await nango.batchSave(page, "Ticket");
}
await nango.deleteRecordsFromPreviousExecutions("Ticket");
```

```ts
// After
const checkpoint = await nango.getCheckpoint<{ page?: number }>();
let page = checkpoint?.page ?? 1;

await nango.trackDeletesStart("Ticket");

for await (const results of nango.paginate({
  ...cfg,
  paginate: {
    ...cfg.paginate,
    offset_start_value: page,
    on_page: async ({ nextPageParam }) => {
      page = typeof nextPageParam === "number" ? nextPageParam : undefined;
    },
  },
})) {
  await nango.batchSave(results, "Ticket");

  if (page !== undefined) {
    await nango.saveCheckpoint({ page });
  }
}

await nango.clearCheckpoint();
await nango.trackDeletesEnd("Ticket");
```
