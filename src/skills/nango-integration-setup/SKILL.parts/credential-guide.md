## Credential Collection

### Base credentials by auth_mode

Use `auth_mode` from the provider response to determine which credential fields to collect:

| auth_mode | Required credential fields |
|---|---|
| `OAUTH2`, `OAUTH1`, `OAUTH2_CC`, `TBA` | `client_id`, `client_secret` |
| `APP` | `app_id`, `app_link`, `private_key` (RSA PEM) |
| `CUSTOM` | `client_id`, `client_secret`, `app_id`, `app_link`, `private_key` |
| `BASIC` | credentials are set at the connection level — skip for integration creation |
| `API_KEY` | credentials are set at the connection level — skip for integration creation |
| `NONE` | no credentials needed |

For `auth_mode` values not in this table, inspect `connection_configuration` (see below) and collect those fields. Do not guess — ask only what the provider response specifies.

Optional fields (collect only if the user wants to configure them):
- OAUTH2 / OAUTH1 / TBA: `scopes` (comma-separated list)
- OAUTH2 / OAUTH1 / TBA: `webhook_secret`

### connection_configuration fields

After determining auth_mode credentials, check the `connection_configuration` array in the provider response. This array describes additional provider-specific setup parameters (e.g. `subdomain`, `app_handle`, `organization_id`, `instance_url`).

For each object in `connection_configuration`:
1. Read its `name` (the parameter key) and any `description`, `title`, or `prefix` fields.
2. Ask the user for the value if it has not already been collected.
3. Include these values in the request body alongside the credentials.

If `connection_configuration` is empty or absent, skip this step.

### Credential format in the API request body

Include the `credentials` object in POST/PATCH requests:

```json
// OAUTH2 / OAUTH1 / TBA / OAUTH2_CC
{
  "credentials": {
    "type": "OAUTH2",
    "client_id": "...",
    "client_secret": "...",
    "scopes": "read:users,write:issues"
  }
}

// APP
{
  "credentials": {
    "type": "APP",
    "app_id": "123456",
    "app_link": "https://github.com/apps/my-app",
    "private_key": "-----BEGIN RSA PRIVATE KEY-----\n..."
  }
}

// CUSTOM
{
  "credentials": {
    "type": "CUSTOM",
    "client_id": "...",
    "client_secret": "...",
    "app_id": "...",
    "app_link": "...",
    "private_key": "..."
  }
}
```

For `API_KEY` and `BASIC` auth modes, omit the `credentials` field entirely when creating or updating the integration. Inform the user: "For this provider, credentials (API key / username and password) are provided when creating a connection, not when setting up the integration."
