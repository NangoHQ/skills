## Workflow (recommended)
1. Decide whether this is an action or a sync.
2. Gather required inputs (integration id, connection id, script name, and API docs/sample responses; actions: test input JSON).
3. Verify this is a Zero YAML TypeScript project (no `nango.yaml`) and you are in the Nango root (`.nango/` exists).
4. Compile as needed with `nango compile` (one-off).
5. Create/update the function file under `{integrationId}/actions/` or `{integrationId}/syncs/`.
6. Register the file in `index.ts` (side-effect import).
7. Validate with `nango dryrun ... --validate -e dev --no-interactive --auto-confirm` (actions: never omit `--input '{...}'`; use `--input '{}'` for no-input actions).
8. If validation can't pass, stop and return early stating the missing external state/inputs required (never hand-author `*.test.json`).
9. Ensure `<script-name>.test.json` exists by running `nango dryrun ... --save -e dev --no-interactive --auto-confirm` (actions: always include `--input '{...}'`).
10. Generate tests with `nango generate:tests` (required) and run `npm test`.
11. Deploy with `nango deploy dev`.
