## Common Mistakes

| Mistake | Impact | Fix |
|---------|--------|-----|
| Missing/incorrect index.ts import | Function not loaded | Add side-effect import (`import './<path>.js'`) |
| Hand-authoring/editing/renaming `*.test.json` (including `hash` tampering) | Fake/brittle tests; breaks recorded mock integrity | Re-run `nango dryrun ... --validate` until it passes, then run `nango dryrun ... --save` to re-record `<script-name>.test.json` (simulate error paths in `.test.ts` with `vi.spyOn`, not by editing mocks) |
| Skipping `nango generate:tests` | Missing/out-of-date `.test.ts` | Run `nango generate:tests` after `--save` |
| Action dryrun without `--input` | Validation fails / wrong mocks | Always pass `--input '{...}'` (use `'{}'` for no-input actions) |
| Dryrun without `-e dev --no-interactive --auto-confirm` | CLI prompts/hangs in automation | Use `-e dev --no-interactive --auto-confirm` (and `NANGO_CLI_UPGRADE_MODE=ignore` if needed) |
| Inventing Nango CLI commands for tokens/connections (e.g., `nango token`, `nango connection get`) | Wasted time; incorrect approach | Use the Nango HTTP API (Connections/Proxy) authenticated with `Authorization: Bearer ${NANGO_SECRET_KEY_DEV}`; look up the correct endpoint in https://nango.dev/docs/reference/api |
| Calling Nango Proxy with a provider OAuth token in `Authorization` | Proxy auth fails; confusion between Nango vs provider auth | Use Nango secret key in `Authorization` and pass `Provider-Config-Key` + `Connection-Id` headers (Nango injects provider auth) |
| Using legacy dryrun flags (`--save-responses`, `-m`) | Dryrun/mocks fail | Use `--save` and `--metadata` |
| Calling deleteRecordsFromPreviousExecutions after partial fetch | False deletions | Let failures fail; only call after full successful save |
| trackDeletes: true | Deprecated | Use deleteRecordsFromPreviousExecutions (full) or batchDelete (incremental) |
| Retrying non-idempotent writes blindly | Duplicate side effects | Avoid retries or use provider idempotency keys |
| Using any in mapping | Loses type safety | Use inline types |
| Using --connection-id | Dryrun fails | Use positional connection id |
