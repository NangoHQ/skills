## Common Mistakes

| Mistake | Impact | Fix |
|---------|--------|-----|
| Missing/incorrect index.ts import | Function not loaded | Add side-effect import (`import './<path>.js'`) |
| Using legacy dryrun flags (`--save-responses`, `-m`) | Dryrun/mocks fail | Use `--save` and `--metadata` |
| Calling deleteRecordsFromPreviousExecutions after partial fetch | False deletions | Let failures fail; only call after full successful save |
| trackDeletes: true | Deprecated | Use deleteRecordsFromPreviousExecutions (full) or batchDelete (incremental) |
| Retrying non-idempotent writes blindly | Duplicate side effects | Avoid retries or use provider idempotency keys |
| Using any in mapping | Loses type safety | Use inline types |
| Using --connection-id | Dryrun fails | Use positional connection id |
