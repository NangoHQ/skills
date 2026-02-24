## Final Checklists

Action:
- [ ] Nango root verified
- [ ] Schemas + types are clear (inline or relative imports)
- [ ] createAction with endpoint/input/output/scopes
- [ ] Proxy config includes API doc link and intentional retries
- [ ] `nango.ActionError` used for expected failures
- [ ] Registered in index.ts
- [ ] Dryrun succeeds with --validate
- [ ] Mocks recorded with --save (if adding tests)
- [ ] Tests generated and npm test passes

Sync:
- [ ] Nango root verified
- [ ] Models map defined; record ids are strings
- [ ] createSync with endpoints/frequency/syncType
- [ ] paginate + batchSave in exec
- [ ] deleteRecordsFromPreviousExecutions at end for full sync
- [ ] Metadata handled if required
- [ ] Registered in index.ts
- [ ] Dryrun succeeds with --validate
- [ ] Mocks recorded with --save (if adding tests)
- [ ] Tests generated and npm test passes
