# Functions API Reference

## Host resolution

Resolve the base host in this order:
1. `NANGO_SERVER_URL` from the process environment
2. `NANGO_SERVER_URL` from a local `.env` file
3. `https://api.nango.dev`

All function endpoints are relative to that host:
- `POST /functions/compile`
- `POST /functions/dryruns`
- `GET /functions/dryruns/{id}`
- `POST /functions/deployments`
- `GET /functions/deployments/{id}`

## Auth

- Header: `Authorization: Bearer <NANGO_SECRET_KEY>`
- Header: `Content-Type: application/json`
- Use the environment tied to the secret key
- Prefer request bodies over query params
- `POST /functions/compile` requires `environment:functions:compile`
- `POST /functions/dryruns` and `GET /functions/dryruns/{id}` require `environment:functions:dryrun`
- `POST /functions/deployments` and `GET /functions/deployments/{id}` require `environment:deploy`

## Request sequencing

1. Compile first.
2. Start a dryrun only after compile passes.
3. Poll dryrun status until `success` or `failed`.
4. Start deployment only when the task explicitly includes deployment.
5. Poll deployment status until `success` or `failed`.

## Request body guidance

Compile payload:

```json
{
  "code": "string"
}
```

Dryrun payload:

```json
{
  "integration_id": "string",
  "function_type": "action | sync",
  "code": "string",
  "connection_id": "string"
}
```

Add only the fields needed by the function:
- Actions: `input`, `metadata`
- Syncs: `metadata`, `checkpoint`

Deployment payload:

```json
{
  "type": "function",
  "integration_id": "string",
  "function_name": "string",
  "function_type": "action | sync",
  "code": "string"
}
```

Add only when needed:
- `version`: optional deployment version tag
- `allow_destructive`: optional boolean for overwriting an existing standalone function

Remote dryrun supports the request-body equivalents of CLI `--input`, `--metadata`, `--checkpoint`, and legacy `--lastSyncDate` as `input`, `metadata`, `checkpoint`, and `last_sync_date`. Do not use `last_sync_date` for new sync designs. It does not expose CLI `--validate` or `--save`; compile first, then dryrun, and do not expect mock files to be recorded.

## Response guidance

Compile success (`200`) returns:

```json
{
  "bundle_size_bytes": 12345,
  "bundled_js": "...",
  "compiled_at": "2026-05-26T00:00:00.000Z"
}
```

Dryrun create success (`202`) returns:

```json
{
  "id": "00000000-0000-0000-0000-000000000000",
  "status": "running",
  "created_at": "2026-05-26T00:00:00.000Z"
}
```

Poll `GET /functions/dryruns/{id}` until `status` is `success` or `failed`.

Do not call `/functions/dryruns/{id}/result`; it is a sandbox callback endpoint, not a customer polling endpoint.

Terminal success includes `output` and may include `result`:

```json
{
  "id": "00000000-0000-0000-0000-000000000000",
  "status": "success",
  "integration_id": "github",
  "function_type": "action",
  "created_at": "2026-05-26T00:00:00.000Z",
  "updated_at": "2026-05-26T00:00:05.000Z",
  "duration_ms": 1234,
  "output": "Executing -> function\nDone",
  "result": { "ok": true }
}
```

Terminal failure includes `error`:

```json
{
  "id": "00000000-0000-0000-0000-000000000000",
  "status": "failed",
  "integration_id": "github",
  "function_type": "sync",
  "created_at": "2026-05-26T00:00:00.000Z",
  "updated_at": "2026-05-26T00:00:05.000Z",
  "error": {
    "code": "dryrun_error",
    "message": "Dry run failed"
  }
}
```

Deployment create success (`202`) returns:

```json
{
  "id": "00000000-0000-0000-0000-000000000000",
  "status": "running",
  "created_at": "2026-05-26T00:00:00.000Z"
}
```

Poll `GET /functions/deployments/{id}` until `status` is `success` or `failed`.

Do not call `/functions/deployments/{id}/result`; it is a sandbox callback endpoint, not a customer polling endpoint.

Terminal deployment success includes `deployed`, `deployed_functions`, and `output`:

```json
{
  "id": "00000000-0000-0000-0000-000000000000",
  "status": "success",
  "integration_id": "github",
  "function_name": "list-repos",
  "function_type": "action",
  "created_at": "2026-05-26T00:00:00.000Z",
  "updated_at": "2026-05-26T00:00:05.000Z",
  "started_at": "2026-05-26T00:00:00.000Z",
  "completed_at": "2026-05-26T00:00:05.000Z",
  "duration_ms": 1234,
  "deployed": true,
  "deployed_functions": [{ "name": "list-repos", "version": "1" }],
  "output": "Successfully deployed the functions:\n- list-repos@1"
}
```

Terminal deployment failure includes `error`:

```json
{
  "id": "00000000-0000-0000-0000-000000000000",
  "status": "failed",
  "integration_id": "github",
  "function_name": "list-repos",
  "function_type": "action",
  "created_at": "2026-05-26T00:00:00.000Z",
  "updated_at": "2026-05-26T00:00:05.000Z",
  "error": {
    "code": "deployment_error",
    "message": "Deployment failed"
  }
}
```

## Dryrun examples

Use the `NANGO_SECRET_KEY` for the target environment; the environment is inferred from that key.

```bash
# Compile first
curl -sS -X POST "$NANGO_SERVER_URL/functions/compile" \
  -H "Authorization: Bearer $NANGO_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "...TypeScript source..."
  }'

# Dryrun an action
curl -sS -X POST "$NANGO_SERVER_URL/functions/dryruns" \
  -H "Authorization: Bearer $NANGO_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "integration_id": "slack",
    "function_type": "action",
    "code": "...TypeScript source...",
    "connection_id": "conn-1",
    "input": { "channel_id": "C123", "text": "Hello" }
  }'

# Dryrun a no-input action
curl -sS -X POST "$NANGO_SERVER_URL/functions/dryruns" \
  -H "Authorization: Bearer $NANGO_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "integration_id": "github",
    "function_type": "action",
    "code": "...TypeScript source...",
    "connection_id": "conn-1",
    "input": {}
  }'

# Dryrun a sync from a checkpoint
curl -sS -X POST "$NANGO_SERVER_URL/functions/dryruns" \
  -H "Authorization: Bearer $NANGO_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "integration_id": "salesforce",
    "function_type": "sync",
    "code": "...TypeScript source...",
    "connection_id": "conn-1",
    "checkpoint": { "updated_after": "2024-01-15T00:00:00Z" }
  }'

# Dryrun with metadata
curl -sS -X POST "$NANGO_SERVER_URL/functions/dryruns" \
  -H "Authorization: Bearer $NANGO_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "integration_id": "slack",
    "function_type": "sync",
    "code": "...TypeScript source...",
    "connection_id": "conn-1",
    "metadata": { "team_id": "T123" }
  }'

# Poll status with the id returned by POST /functions/dryruns
curl -sS "$NANGO_SERVER_URL/functions/dryruns/$DRYRUN_ID" \
  -H "Authorization: Bearer $NANGO_SECRET_KEY"

# Deploy only when requested
curl -sS -X POST "$NANGO_SERVER_URL/functions/deployments" \
  -H "Authorization: Bearer $NANGO_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "function",
    "integration_id": "github",
    "function_name": "list-repos",
    "function_type": "action",
    "code": "...TypeScript source..."
  }'

# Poll deployment status with the id returned by POST /functions/deployments
curl -sS "$NANGO_SERVER_URL/functions/deployments/$DEPLOYMENT_ID" \
  -H "Authorization: Bearer $NANGO_SECRET_KEY"
```

## Error handling

- `400 invalid_body`: remove unsupported fields; the schemas are strict.
- `403 forbidden`: check the API key scope for the endpoint.
- `404 integration_not_found`: create or select the integration ID in the target environment.
- `404 connection_not_found`: check `connection_id` and `integration_id` for dryruns.
- `404 dryrun_not_found`: poll with the exact id returned by the dryrun create response.
- `404 deployment_not_found`: poll with the exact id returned by the deployment create response.
- `503 execution_environment_unavailable`: retry later; the execution sandbox capacity is temporarily unavailable.
- `504 timeout`: simplify the function, reduce provider calls, or retry when the sandbox is healthy.
