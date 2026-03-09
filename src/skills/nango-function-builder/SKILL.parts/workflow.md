## Workflow (recommended)
1. Decide whether this is an action or a sync.
2. For syncs, inspect the provider docs for an incremental path first (`updated_at` / `modified_since` filters, changed-records endpoints, deleted-record endpoints, cursors/page tokens, or webhooks). Prefer checkpoints when the API can expose changes reliably. Use a full refresh only if the docs show no practical incremental strategy.
3. Gather required inputs (integration id, connection id, script name, and API docs/sample responses; actions: test input JSON). For syncs, also capture the checkpoint shape you will store (timestamp, cursor, page token, or composite) and the deletion strategy. If you need connection details/credentials or want to do setup/discovery calls, use the Nango HTTP API (Connections/Proxy; auth with Nango secret key); do not invent Nango CLI token/connection commands.
4. Verify this is a Zero YAML TypeScript project (no `nango.yaml`) and you are in the Nango root (`.nango/` exists).
5. Compile as needed with `nango compile` (one-off).
6. Create/update the function file under `{integrationId}/actions/` or `{integrationId}/syncs/`.
7. Register the file in `index.ts` (side-effect import).
8. Validate with `nango dryrun ... --validate -e dev --no-interactive --auto-confirm` (actions: never omit `--input '{...}'`; use `--input '{}'` for no-input actions; checkpointed syncs can use `--checkpoint '{...}'` to simulate a resumed run).
9. If validation can't pass, stop and return early stating the missing external state/inputs required (never hand-author/edit/rename/move `*.test.json`).
10. Ensure `<script-name>.test.json` exists by running `nango dryrun ... --save -e dev --no-interactive --auto-confirm` (actions: always include `--input '{...}'`; to update mocks, re-run `--save`, do not edit the file).
11. Generate tests with `nango generate:tests` (required) and run `npm test`.
12. Deploy with `nango deploy dev`.
