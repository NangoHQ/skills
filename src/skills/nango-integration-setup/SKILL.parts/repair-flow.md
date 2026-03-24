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
