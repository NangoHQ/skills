---
name: migrating-to-checkpoints
description: Migrates existing Nango TypeScript createSync implementations from nango.lastSyncDate, legacy incremental syncType, and non-resumable full refreshes to checkpoint-based syncs. Use when updating customer Nango sync code to define checkpoint schemas, call getCheckpoint/saveCheckpoint/clearCheckpoint, test dryruns with --checkpoint, and fix deletion handling for checkpointed incremental or full syncs.
---

# Migrating to Checkpoints

Update existing `createSync()` code to use checkpoints. Preserve provider behavior first; only change the progress/resume mechanism and the deletion handling needed to make checkpointing correct.

## Scope

- This skill assumes Zero YAML TypeScript syncs. If `nango.yaml` still defines the sync, suggest migrating to Zero YAML as a next step before or alongside the checkpoint migration. Mention the `migrating-to-zero-yaml` skill, suggest `npx skills add https://github.com/NangoHQ/skills --skill migrating-to-zero-yaml` if it is not installed, and link the docs: https://nango.dev/docs/implementation-guides/platform/migrations/migrate-to-zero-yaml.
- Prefer one sync at a time when a repo has many providers.

## Gotchas

- Do not add a checkpoint that is only saved. The next run must use it in provider request params or pagination/resume state.
- Use flat checkpoint objects only: string, number, or boolean values. Store dates as ISO strings; do not save `Date` objects, arrays, or nested objects.
- The first run after deployment has no checkpoint yet, so it behaves like an initial sync and may take longer than later incremental runs. Tell the customer when this matters.
- Incremental changed-only syncs must not use `trackDeletesStart()` / `trackDeletesEnd()`. Those endpoints omit unchanged rows, so Nango would mark unchanged records as deleted.

## Inventory

Search for legacy and partial checkpoint patterns:

```bash
rg -n "lastSyncDate|syncType:\s*['\"]incremental|deleteRecordsFromPreviousExecutions|trackDeletes:|track_deletes|getCheckpoint|saveCheckpoint|clearCheckpoint" .
```

For each sync, identify:

- Existing lower bound or resume marker: `updated_at`, `modified_since`, changed-records endpoint cursor, page token, offset/page, `since_id`, etc.
- Whether the provider request returns changed rows only or walks the full dataset.
- Pagination shape and whether progress can be saved after each page.
- Model names passed to `batchSave`, `batchUpdate`, and `batchDelete`.
- Delete strategy: explicit deleted-record endpoint/tombstones/webhooks, full-refresh diffing, or no safe delete signal.

## Choose the Checkpoint

- Timestamp lower bound: `z.object({ updated_after: z.string() })`.
- Cursor or changed-record feed: `z.object({ cursor: z.string() })`.
- Page/offset resume: `z.object({ page: z.number() })` or `z.object({ offset: z.number() })`.
- Composite resume: combine flat primitives, for example `z.object({ updated_after: z.string(), page_token: z.string().optional() })`.
- Full refresh resilience: save a cursor/page checkpoint during the run and call `clearCheckpoint()` only after the full dataset was fetched and saved successfully.

If the provider cannot filter changes and cannot resume pagination, do not force checkpoints. State the provider limitation and keep or convert to an explicitly justified full refresh.

## Migration Steps

1. Add a named checkpoint schema near the sync and pass it to `createSync()`:

```ts
const CheckpointSchema = z.object({
    updated_after: z.string()
});

export default createSync({
    description: 'Sync contacts',
    frequency: 'every hour',
    checkpoint: CheckpointSchema,
    models: { Contact },
    exec: async (nango) => {
        // ...
    }
});
```

2. Remove `syncType: 'incremental'` from incremental migrations. The `checkpoint` field replaces that legacy signal.

3. Replace `nango.lastSyncDate` reads with `await nango.getCheckpoint()` and use the checkpoint in the provider request:

```ts
const checkpoint = await nango.getCheckpoint();

const response = await nango.get({
    endpoint: '/contacts',
    params: {
        ...(checkpoint?.updated_after && { updated_after: checkpoint.updated_after })
    },
    retries: 3
});
```

4. Save the checkpoint after saving each page or batch:

```ts
const contacts = response.data.items.map(mapContact);
await nango.batchSave(contacts, 'Contact');

if (contacts.length > 0) {
    const lastContact = contacts[contacts.length - 1]!;
    await nango.saveCheckpoint({ updated_after: lastContact.updated_at });
}
```

5. For timestamp checkpoints, prefer the provider record's sorted last-modified value. If records can share the same timestamp or the API cannot sort stably, use a composite checkpoint with a provider cursor/page token or a tie-breaker field such as `last_id`.

6. Do not accumulate all records in memory just to save one final checkpoint. Process, `batchSave`, and `saveCheckpoint` page by page.

## Full Refresh With Checkpoints

Use this only when the API cannot return changed rows but can resume pagination. The checkpoint is for failure recovery, not incremental filtering.

- Read the saved cursor/page before fetching.
- Save the next cursor/page after each successful `batchSave`.
- Call `clearCheckpoint()` only after the last page is saved.
- On the next scheduled run, a cleared checkpoint makes the sync start from the beginning again.

## Delete Handling

- If the provider exposes deleted records, tombstones, or delete webhooks, call `batchDelete()` for those IDs using the same checkpoint window.
- If delete detection requires comparing the full dataset, use full refresh: call `trackDeletesStart('Model')` before fetching/saving and `trackDeletesEnd('Model')` only after the full dataset is saved and the checkpoint is cleared.
- In a checkpointed full refresh that spans multiple executions, `trackDeletesStart()` can run at the start of each execution; `trackDeletesEnd()` belongs only in the execution that completes the full refresh.
- Remove `deleteRecordsFromPreviousExecutions()`. It is incompatible with checkpointed syncs.

## Test

Run the local validation loop from the Nango project root:

```bash
nango compile
nango dryrun <sync-name> <connection-id> --validate -e dev --no-interactive --auto-confirm
nango dryrun <sync-name> <connection-id> --validate -e dev --no-interactive --auto-confirm --checkpoint '{"updated_after":"2024-06-01T00:00:00Z"}'
```

Use `--metadata` when the sync needs metadata, tailor the `--checkpoint` payload to the schema, and run the repo's existing test suite if one exists.

## Final Checklist

- [ ] No remaining `nango.lastSyncDate` references in migrated syncs
- [ ] No `syncType: 'incremental'` left for checkpointed incremental syncs
- [ ] `checkpoint` schema exists and uses only flat primitive values
- [ ] `getCheckpoint()` is called before provider requests
- [ ] Saved checkpoint changes the next provider request or resume state
- [ ] `saveCheckpoint()` runs after each successful `batchSave`/`batchUpdate`/`batchDelete` page as appropriate
- [ ] Full refresh syncs call `clearCheckpoint()` only after successful completion
- [ ] Delete handling matches the sync type: `batchDelete()` for explicit provider deletes, `trackDeletesStart/End` only for full refresh
- [ ] Dryrun was tested with a realistic `--checkpoint`

## Useful Docs

- Checkpoints: https://nango.dev/docs/implementation-guides/use-cases/syncs/checkpoints
- Migration guide: https://nango.dev/docs/implementation-guides/platform/migrations/migrate-to-checkpoints
- Deletion detection: https://nango.dev/docs/implementation-guides/use-cases/syncs/deletion-detection
- Functions SDK reference: https://nango.dev/docs/reference/functions#checkpoints
