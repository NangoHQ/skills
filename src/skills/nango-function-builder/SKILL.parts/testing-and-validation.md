## Testing and Validation Workflow

Recommended loop while coding:
1. Implement the function file under `{integrationId}/actions/` or `{integrationId}/syncs/`.
2. Register it via side-effect import in `index.ts`.
3. Dryrun with `nango dryrun ... --validate` until it passes.

Dryrun + validate:
- Action: `nango dryrun <action-name> <connection-id> --input '{...}' --validate`
- Sync: `nango dryrun <sync-name> <connection-id> --validate`
- Incremental sync testing: add `--lastSyncDate "YYYY-MM-DD"`

Record mocks + generate tests:
1. `nango dryrun <script-name> <connection-id> --save` (add `--input` for actions; add `--metadata` if the script reads metadata)
2. `nango generate:tests` (or narrow: `-i <integrationId>`, `-s <sync-name>`, `-a <action-name>`)
3. Run tests via `npm test` (Vitest) or `npx vitest run`

Reference: https://nango.dev/docs/implementation-guides/platform/functions/testing
