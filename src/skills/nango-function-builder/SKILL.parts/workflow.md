## Workflow (recommended)
1. Verify this is a Zero YAML TypeScript project (no `nango.yaml`) and you are in the Nango root (`.nango/` exists).
2. Compile as needed with `nango compile` (one-off).
3. Create/update the function file under `{integrationId}/actions/`, `{integrationId}/syncs/`, or `{integrationId}/on-events/`.
4. Register the file in `index.ts` (side-effect import).
5. Validate with `nango dryrun ... --validate`.
6. Record mocks with `nango dryrun ... --save` and generate tests with `nango generate:tests`.
7. Run `npm test`.
8. Deploy with `nango deploy dev`.
