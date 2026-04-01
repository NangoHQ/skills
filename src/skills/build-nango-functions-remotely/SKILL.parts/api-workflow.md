## Remote API Workflow (required)

Read `references/api.md` before making remote calls.

Required sequence:
1. Compile first with `/remote-functions/compile`.
2. Dryrun second with `/remote-functions/dryrun`.
3. Deploy last with `/remote-functions/deploy`.

Rules:
- These endpoints are relative. Always resolve them against the chosen `NANGO_SERVER_URL`.
- Send `Authorization: Bearer <NANGO_SECRET_KEY>` and `Content-Type: application/json`.
- Do not send query params unless the API docs or an existing caller prove they are supported.
- Use the server's validation errors to correct payloads. Do not invent undocumented fields when the API rejects a request.
- For actions, dryrun should include `test_input` and `metadata` only when needed.
- For syncs, dryrun should include `metadata` and `checkpoint` when needed to simulate a resumed run. Do not introduce `last_sync_date` for a new sync design.
