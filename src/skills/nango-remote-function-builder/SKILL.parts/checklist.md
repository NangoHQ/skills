## Final Checklists

Action:
- [ ] `references/actions.md` was used for the action pattern
- [ ] Schemas and types are clear (inline or relative imports)
- [ ] `createAction()` includes endpoint, input, output, and scopes when required
- [ ] Provider call includes an API doc link comment and intentional retries
- [ ] `nango.ActionError` is used for expected failures
- [ ] Deploy succeeds by using the `ts-deploy` endpoint
- [ ] Run succeeds and returns the expected result using the `ts-run` endpoint

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
- [ ] Deploy succeeds by using the `ts-deploy` endpoint
- [ ] Run succeeds and returns the expected result using the `ts-run` endpoint
