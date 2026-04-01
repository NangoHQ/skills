# Remote Functions API Reference

## Host resolution

Resolve the base host in this order:
1. `NANGO_SERVER_URL` from the process environment
2. `NANGO_SERVER_URL` from a local `.env` file
3. `https://api.nango.dev`

All remote function endpoints are relative to that host:
- `/remote-functions/compile`
- `/remote-functions/dryrun`
- `/remote-functions/deploy`

## Auth

- Header: `Authorization: Bearer <NANGO_SECRET_KEY>`
- Header: `Content-Type: application/json`
- Use the environment tied to the secret key
- Prefer request bodies over query params

## Request sequencing

1. Compile first.
2. Dryrun only after compile passes.
3. Deploy only when the task explicitly includes deployment.

## Request body guidance

Start compile and deploy payloads with:

```json
{
  "integration_id": "string",
  "function_name": "string",
  "function_type": "action | sync",
  "code": "string",
  "environment": "string"
}
```

Start dryrun payloads with:

```json
{
  "integration_id": "string",
  "function_name": "string",
  "function_type": "action | sync",
  "connection_id": "string",
  "environment": "string"
}
```

Add only the fields needed by the function:
- Actions: `test_input`, `metadata`
- Syncs: `metadata`, `checkpoint`

Because these endpoints are evolving, trust the server's validation errors and any existing caller code over stale examples. If the API rejects a field, remove or rename it based on the returned error instead of inventing new parameters.
