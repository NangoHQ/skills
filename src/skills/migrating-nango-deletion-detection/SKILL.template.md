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
- After each successful `batchSave()`, call `saveCheckpoint()` with the next page/cursor — on every page, including the last one. Do not guard the call with "more pages remain" (`if (nextPage) { ... }`); a run whose whole dataset fits on the first page then never saves a checkpoint at all.
- Call `clearCheckpoint()` only after the last page is saved, and only if a checkpoint was actually saved this execution or resumed from a prior one. `clearCheckpoint()` is optimistic-locked: deleting a checkpoint that was never written fails with `checkpoint_conflict`, identical to a genuine concurrent-write conflict.
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
let checkpointSaved = false;

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

  // Save on every page, including the last — do not guard this with
  // `if (page !== undefined)`. Skipping it whenever there is no next page
  // means a run whose entire dataset fits on the first page never saves a
  // checkpoint, and the clearCheckpoint() below would then fail with
  // checkpoint_conflict (deleting a row that was never written).
  await nango.saveCheckpoint({ page });
  checkpointSaved = true;
}

// Only clear if this execution (or a resumed prior one) actually has a
// checkpoint to delete — clearCheckpoint() is optimistic-locked and errors
// the same way on "no row" as on a genuine concurrent write.
if (checkpointSaved || checkpoint?.page !== undefined) {
  await nango.clearCheckpoint();
}
await nango.trackDeletesEnd("Ticket");
```
