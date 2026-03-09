## Required Inputs (Ask User if Missing)

Always:
- Integration ID (provider name)
- Connection ID (for dryrun)
- Script name (kebab-case)
- API reference URL or sample response

Action-specific:
- Use case summary
- Input parameters
- Output fields
- Metadata JSON if required
- Test input JSON for dryrun `--input` and mocks (required; use `{}` for no-input actions)

Sync-specific:
- Model name (singular, PascalCase)
- Frequency (every hour, every 5 minutes, etc.)
- Checkpoint strategy (preferred: modified-at filter, changed-records endpoint, cursor/page token, or composite checkpoint)
- Delete strategy (deleted-record endpoint/webhook, or why full refresh is required)
- Metadata JSON if required (team_id, workspace_id)

If any required external values are missing, ask the user for them before writing code. For sync strategy, inspect the API docs/sample response first and choose a checkpoint plus deletion approach whenever the provider supports one. Use the chosen strategy in dryrun commands and tests.

### Prompt Templates (Use When Details Are Missing)

Action prompt:

```
Please provide:
Integration ID (required):
Connection ID (required):
Use Case Summary:
Action Inputs:
Action Outputs:
Metadata JSON (if required):
Action Name (kebab-case):
API Reference URL:
Test Input JSON (required):
```

Sync prompt:

```
Please provide:
Integration ID (required):
Connection ID (required):
Sync Name (kebab-case):
Model Name (singular, PascalCase):
Endpoint Path (for Nango endpoint):
Frequency (every hour, every 5 minutes, etc.):
Checkpoint Strategy (preferred: updated_at/since filter, cursor, page token, or composite checkpoint):
Delete Strategy (deleted-record endpoint/webhook, or why full refresh is required):
Metadata JSON (if required):
API Reference URL:
```
