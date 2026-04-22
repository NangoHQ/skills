## Dryrun, Mocks, and Tests (required)

Required loop:
1. Run `nango dryrun ... --validate -e dev --no-interactive --auto-confirm` until it passes.
2. Actions: always pass `--input '{...}'` (use `--input '{}'` for no-input actions).
3. Syncs: use `--checkpoint '{...}'` when you need to simulate a resumed run.
4. If validation cannot pass, stop and state the missing external state or inputs required.
5. After validation passes, run `nango dryrun ... --save -e dev --no-interactive --auto-confirm` to generate `<script-name>.test.json`.
6. Run `nango generate:tests`, then `npm test`.

Examples:

```bash
# Validate an action
nango dryrun <action-name> <connection-id> --validate -e dev --no-interactive --auto-confirm --input '{"key":"value"}'

# Validate a no-input action
nango dryrun <action-name> <connection-id> --validate -e dev --no-interactive --auto-confirm --input '{}'

# Validate a sync
nango dryrun <sync-name> <connection-id> --validate -e dev --no-interactive --auto-confirm

# Validate a resumed sync with a checkpoint
nango dryrun <sync-name> <connection-id> --validate -e dev --no-interactive --auto-confirm --checkpoint '{"updated_after":"2024-01-15T00:00:00Z"}'

# Record action mocks after validation passes
nango dryrun <action-name> <connection-id> --save -e dev --no-interactive --auto-confirm --input '{"key":"value"}'

# Record sync mocks after validation passes
nango dryrun <sync-name> <connection-id> --save -e dev --no-interactive --auto-confirm

# Stub metadata when needed
nango dryrun <script-name> <connection-id> --validate -e dev --no-interactive --auto-confirm --metadata '{"team_id":"123"}'
```

Hard rules:
- Treat `<script-name>.test.json` as generated output. Never create, edit, rename, or move it.
- If mocks are wrong or stale, fix the code and re-record with `--save`.
- Do not hard-code error payloads in `*.test.json`; use a Vitest test with `vi.spyOn(...)` for 404, 401, 429, or timeout cases.
- Connection ID is the second positional argument; do not use `--connection-id`.
- Use `--integration-id <integration-id>` when script names overlap across integrations.
- Prefer `--checkpoint` for new incremental syncs; `--lastSyncDate` is a legacy pattern.
- If `nango` is not on `PATH`, use `npx nango ...`.
- CLI upgrade prompts can block automation; set `NANGO_CLI_UPGRADE_MODE=ignore` if needed.

Reference: https://nango.dev/docs/implementation-guides/platform/functions/testing
