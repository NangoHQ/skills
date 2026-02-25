## Workflow (recommended)
1. Verify this is a Zero YAML TypeScript project (no `nango.yaml`) and you are in the Nango root (`.nango/` exists).
2. Compile as needed with `nango compile` (one-off).
3. Create/update the function file under `{integrationId}/actions/` or `{integrationId}/syncs/`.
4. Register the file in `index.ts` (side-effect import).
5. Validate with `nango dryrun ... --validate -e dev --no-interactive --auto-confirm` (actions: always include `--input '{...}'`).
6. Ensure `<script-name>.test.json` exists by running `nango dryrun ... --save -e dev --no-interactive --auto-confirm` (actions: always include `--input '{...}'`; never hand-author `.test.json`).
7. Generate tests with `nango generate:tests` (required).
8. Run `npm test`.
9. Deploy with `nango deploy dev`.
