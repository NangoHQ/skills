---
name: nango-integration-setup
description: Sets up or repairs a Nango integration for a given provider. Lists existing integrations and offers reuse, or collects the correct credentials and creates a new one. Also repairs broken integrations by fetching current credentials and patching missing or incorrect fields. Use when a specific Nango integration is needed or when an existing integration is not working.
---

# Nango Integration Setup
Find, create, or repair a Nango integration for a given provider.

## When to use
- User needs a specific integration (e.g. "set up HubSpot in Nango", "I need a Slack integration")
- An integration is broken or has missing / incorrect credentials
- User wants to update credentials or OAuth scopes on an existing integration

## API Authentication

All Nango API calls require a Bearer token and a base URL.

**Secret key:** Check `NANGO_SECRET_KEY` in the environment first. If unset, ask the user: "What is your Nango secret key?"

**Base URL:** Check `NANGO_BASE_URL` in the environment. If unset, default to `https://api.nango.dev`.

Use on every request:
```
Authorization: Bearer <secret_key>
Content-Type: application/json
```

## Workflow

### Step 1 — Identify the provider
- If the user provided a provider name (e.g. `hubspot`, `slack`, `linear`), use it.
- If not, ask: "Which provider do you need an integration for?"

### Step 2 — Look up the provider
- `GET {base_url}/providers/{provider}`
- If 404: tell the user the provider name is invalid and ask them to correct it. Retry.
- On success: extract `auth_mode`, `display_name`, and `connection_configuration`.

### Step 3 — Check for existing integrations
- `GET {base_url}/integrations`
- Filter `data[]` where `provider === <provider>`.
- **If 1 or more found:**
  - Show the list (unique_key, display_name, created_at).
  - Ask: "One or more integrations already exist for {display_name}. Would you like to use one of these, or create a new one?"
  - If user picks an existing one: fetch it with `GET {base_url}/integrations/{uniqueKey}` and return the integration info. Done.
  - If user wants a new one: continue to Step 4.
- **If none found:** continue to Step 4.

### Step 4 — Confirm creation
- Ask: "No existing integration found for {display_name}. Would you like to create one?"
- If no: stop. Tell the user they can create one manually in the Nango dashboard.
- If yes: continue to Step 5.

### Step 5 — Collect credentials
- Follow the **Credential Collection** section to determine which fields to collect.
- Collect all required fields before proceeding.

### Step 6 — Confirm unique_key
- Suggest `unique_key` = `{provider}` (e.g. `hubspot`).
- If the user mentions they need multiple integrations for the same provider, suggest `{provider}-{env}` (e.g. `hubspot-prod`).
- Ask the user to confirm or override the suggested unique_key.

### Step 7 — Create the integration
- Follow the **Create Integration** section.

## Provider Lookup

Fetch provider details before collecting credentials:

```
GET {base_url}/providers/{provider}
```

Extract from the response:
- `auth_mode`: determines which credential fields are required
- `display_name`: use in prompts to the user
- `connection_configuration`: additional required setup fields beyond the standard auth credentials

If the provider is not found (404), tell the user and ask for the correct provider identifier. Valid provider names are the short slugs used in Nango (e.g. `hubspot`, `github`, `google-drive`, `linear`). You can list all providers with `GET {base_url}/providers` if the user is unsure.

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

## Create Integration

```
POST {base_url}/integrations
Authorization: Bearer <secret_key>
Content-Type: application/json

{
  "unique_key": "<confirmed_unique_key>",
  "provider": "<provider>",
  "credentials": { ... }
}
```

Omit `credentials` for `API_KEY` and `BASIC` auth modes.

On **200**: the integration was created. Show the user:
- `unique_key` — they will need this for Nango connections and function calls
- `provider`
- `created_at`

On **400**: surface the full error body. Common causes: `unique_key` already exists, missing or invalid credential fields. Ask the user to correct and retry.

On **401**: the secret key is invalid or expired. Ask the user to re-provide `NANGO_SECRET_KEY`.

## Repair Flow (Integration Not Working or Needs Updates)

Use this flow when the user reports that an existing integration is broken, has missing / incorrect credentials, or needs its OAuth scopes updated.

### Step 1 — Identify the integration
- Ask for the `unique_key` of the broken integration if not already known.
- `GET {base_url}/integrations/{uniqueKey}?include=credentials`
- On 404: the integration does not exist. Offer to create it by starting from Step 4 of the main Workflow.

### Step 2 — Identify gaps
- Extract the current `credentials` object from the response.
- Look up the provider with `GET {base_url}/providers/{provider}` to get `auth_mode` and `connection_configuration`.
- Compare current credentials against the required fields for that `auth_mode` (see Credential Collection).
- Show the user which credential fields are currently set (do not reveal values) and which are missing.

### Step 3 — Collect corrections
- Prompt the user for each missing field.
- If the user says a field is incorrect, ask for the corrected value.
- If scopes need to be updated: use the scopes already known from context (e.g. required by a sync or action being built). If scopes are not known from context, ask the user for the new scope string (comma-separated). Include `scopes` in the credentials object alongside the other credential fields.
- Collect the full set of required credentials for the auth_mode, not just the changed fields — the PATCH requires the complete credentials object to avoid partial state.

### Step 4 — Patch the integration

```
PATCH {base_url}/integrations/{uniqueKey}
Authorization: Bearer <secret_key>
Content-Type: application/json

{
  "credentials": {
    "type": "<auth_mode_type>",
    "<field>": "...",
    ...
  }
}
```

On **200**: confirm the integration was updated. Return the `unique_key` to the user.

On **400 / 404**: surface the error body. Ask the user to verify the `unique_key` and credential values.

## Checklist

Before finishing:
- [ ] Provider validated with `GET /providers/{provider}` — no 404
- [ ] Existing integrations checked before offering to create a new one
- [ ] Credentials collected match the provider's `auth_mode` and `connection_configuration`
- [ ] `unique_key` confirmed with user before creation
- [ ] Integration created or updated successfully (HTTP 200)
- [ ] `unique_key` returned to user — they will need it for Nango connections and function calls
- [ ] For `API_KEY` / `BASIC` modes: user informed that credentials are provided at the connection level, not the integration level
