## Workflow (recommended)
1. Decide whether this is an action or a sync.
2. For syncs, inspect the provider docs for an incremental path first (`updated_at` / `modified_since` filters, changed-records endpoints, deleted-record endpoints, cursors/page tokens, or webhooks). Default to checkpoints whenever the API can expose changes or resume safely. Use a full refresh only if the docs show no practical checkpoint strategy.
3. Gather required inputs (integration id, connection id, script name, and API docs/sample responses; actions: test input JSON). For syncs, also capture the checkpoint shape you will store (timestamp, cursor, page token, or composite) and the deletion strategy. If you need connection details/credentials or want to do setup/discovery calls, use the Nango HTTP API (Connections/Proxy; auth with Nango secret key); do not invent Nango CLI token/connection commands.
4. Before writing a sync, confirm one of these is true: checkpoints will be used, or you can explicitly explain why they cannot be used from the provider docs/sample payloads (for example no change filter/feed, no resumable cursor/page token, or only full-list endpoints). Do not choose full refresh just because it is simpler.
5. Verify this is a Zero YAML TypeScript project (no `nango.yaml`) and you are in the Nango root (`.nango/` exists).
6. Compile as needed with `nango compile` (one-off).
7. Create/update the function file under `{integrationId}/actions/` or `{integrationId}/syncs/`.
8. Register the file in `index.ts` (side-effect import).
9. Validate with `nango dryrun ... --validate -e dev --no-interactive --auto-confirm` (actions: never omit `--input '{...}'`; use `--input '{}'` for no-input actions; checkpointed syncs can use `--checkpoint '{...}'` to simulate a resumed run).
10. If validation can't pass, stop and return early stating the missing external state/inputs required (never hand-author/edit/rename/move `*.test.json`).
11. Ensure `<script-name>.test.json` exists by running `nango dryrun ... --save -e dev --no-interactive --auto-confirm` (actions: always include `--input '{...}'`; to update mocks, re-run `--save`, do not edit the file).
12. Generate tests with `nango generate:tests` (required) and run `npm test`.
13. Deploy with `nango deploy dev`.
