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
