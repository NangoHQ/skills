## Final Checklists

Action:
- [ ] `references/actions.md` was used for the action pattern
- [ ] Schemas and types are clear, and the function stays self-contained in one file
- [ ] `createAction()` includes endpoint, input, output, and scopes when required
- [ ] Fields use passthrough casing or the API's majority casing
- [ ] Provider call includes an API doc link comment and intentional retries
- [ ] `nango.ActionError` is used for expected failures
- [ ] Host was resolved from `NANGO_SERVER_URL`, `.env`, or `https://api.nango.dev`
- [ ] Compile succeeds with `POST /remote-function/compile`
- [ ] Dryrun succeeds with `POST /remote-function/dryrun` and the expected action output
- [ ] Deploy succeeds with `POST /remote-function/deploy` when requested

Sync:
- [ ] `references/syncs.md` was used for the sync pattern
- [ ] Models map is defined, ids are stable strings, and normalized models prefer `.optional()` unless `null` matters
- [ ] Incremental was chosen first, with a checkpoint schema unless full refresh is explicitly justified from docs or payloads
- [ ] `nango.getCheckpoint()` is read at the start and `nango.saveCheckpoint()` runs after each page or batch
- [ ] Checkpoint data changes the provider request or resume state (`since`, `updated_after`, `cursor`, `page_token`, `offset`, `page`, `since_id`, etc.)
- [ ] Changed-only checkpoint syncs (`modified_after`, `updated_after`, changed-records endpoint) do not use `trackDeletesStart()` / `trackDeletesEnd()`
- [ ] If checkpoints were not used, the response explains exactly why no viable checkpoint strategy exists
- [ ] Provider API calls use `retries: 3`; no sync retry value exceeds `3` without a documented exception
- [ ] The function stays self-contained in one file unless the remote API proves multi-file support
- [ ] Host was resolved from `NANGO_SERVER_URL`, `.env`, or `https://api.nango.dev`
- [ ] Compile succeeds with `POST /remote-function/compile`
- [ ] Dryrun succeeds with `POST /remote-function/dryrun` and returns the expected change set
- [ ] Deploy succeeds with `POST /remote-function/deploy` when requested
