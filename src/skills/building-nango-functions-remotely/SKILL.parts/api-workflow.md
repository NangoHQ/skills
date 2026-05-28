## Remote API Workflow (required)

Read `references/api.md` before making remote calls.

Required sequence:
1. Compile first with `POST /functions/compile`.
2. Start dryrun second with `POST /functions/dryruns`.
3. Poll dryrun status with `GET /functions/dryruns/{id}` until terminal.
4. Deploy last with `POST /functions/deployments`.

Rules:
- These endpoints are relative. Always resolve them against the chosen `NANGO_SERVER_URL`.
- Send `Authorization: Bearer <NANGO_SECRET_KEY>` and `Content-Type: application/json`.
- Required API key scopes are `environment:functions:compile` for compile, `environment:functions:dryrun` for dryrun create/status, and `environment:deploy` for deployment.
- Do not send query params unless the API docs or an existing caller prove they are supported.
- Use the server's validation errors to correct payloads. Do not invent undocumented fields when the API rejects a request.
- Compile sends only `{ "code": "..." }`; do not include `integration_id`, `function_name`, or `function_type`.
- Dryrun sends `integration_id`, `function_type`, `code`, and `connection_id`; do not include `function_name`. The server uses an internal temporary name for dryruns.
- Deploy sends `type: "function"`, `integration_id`, `function_name`, `function_type`, and `code`. Add `version` or `allow_destructive` only when explicitly needed.
- For actions, dryrun should include `input` and `metadata` only when needed.
- For syncs, dryrun should include `metadata` and `checkpoint` when needed to simulate a resumed run. Do not introduce `last_sync_date` for a new sync design.
- Dryrun is asynchronous. `POST /functions/dryruns` returns an `id`; poll `GET /functions/dryruns/{id}` for `status`, `output`, `result`, or `error`. Do not call `/functions/dryruns/{id}/result`; it is sandbox-internal.
- Remote dryrun does not expose CLI `--validate` or `--save`; it compiles before running and returns the execution result through the status endpoint, but it does not record local mocks.
- Use legacy `/remote-function/*` endpoints only as an explicit fallback for servers that do not yet expose `/functions/*`.
