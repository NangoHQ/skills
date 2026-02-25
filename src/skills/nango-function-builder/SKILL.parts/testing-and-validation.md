## Testing and Validation Workflow

Recommended loop while coding:
1. Implement the function file under `{integrationId}/actions/` or `{integrationId}/syncs/`.
2. Register it via side-effect import in `index.ts`.
3. Dryrun with `nango dryrun ... --validate -e dev --no-interactive --auto-confirm` until it passes (actions: always include `--input '{...}'`).
4. If dryrun can't pass, stop and return early with the missing external state/inputs required to make it pass (do not hand-author `.test.json`).
5. After validation passes, run `nango dryrun ... --save -e dev --no-interactive --auto-confirm` to generate `<script-name>.test.json` (actions: always include `--input '{...}'`).
6. Run `nango generate:tests` to generate/update `<script-name>.test.ts` (required).
7. Run tests via `npm test` (Vitest) or `npx vitest run`.

Dryrun + validate:
- Action: `nango dryrun <action-name> <connection-id> --validate -e dev --no-interactive --auto-confirm --input '{...}'` (never omit `--input`; use `'{}'` for no-input actions)
- Sync: `nango dryrun <sync-name> <connection-id> --validate -e dev --no-interactive --auto-confirm`
- Incremental sync testing: add `--lastSyncDate "YYYY-MM-DD"`

Reference: https://nango.dev/docs/implementation-guides/platform/functions/testing
