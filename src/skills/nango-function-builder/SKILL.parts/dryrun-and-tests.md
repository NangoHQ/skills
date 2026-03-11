## Dryrun, Mocks, and Tests (required)

Required loop (do not skip steps):
1. Run `nango dryrun ... --validate -e dev --no-interactive --auto-confirm` until it passes.
2. Actions: always pass `--input '{...}'` (use `--input '{}'` for no-input actions).
3. Syncs: use `--checkpoint '{...}'` when you need to simulate a resumed run.
4. If validation cannot pass, stop and state the missing external state or inputs required.
5. After validation passes, run `nango dryrun ... --save -e dev --no-interactive --auto-confirm` to generate `<script-name>.test.json`.
6. Run `nango generate:tests`, then `npm test`.

Hard rules:
- Treat `<script-name>.test.json` as generated output. Never create, edit, rename, or move it (including recorded `hash` fields).
- If mocks are wrong or stale, fix the code and re-record with `--save`.
- Do not hard-code error payloads in `*.test.json`; use a Vitest test with `vi.spyOn(...)` for 404/401/429/timeout cases.
- Connection ID is the second positional argument; do not use `--connection-id`.
- Use `--integration-id <integration-id>` when script names overlap across integrations.
- Prefer `--checkpoint` for new incremental syncs; `--lastSyncDate` is a legacy pattern.
- If `nango` is not on PATH, use `npx nango ...`.
- CLI upgrade prompts can block automation; set `NANGO_CLI_UPGRADE_MODE=ignore` if needed.

Reference: https://nango.dev/docs/implementation-guides/platform/functions/testing
