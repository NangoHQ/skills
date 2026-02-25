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
- Sync type (full or incremental)
- Frequency (every hour, every 5 minutes, etc.)
- Metadata JSON if required (team_id, workspace_id)

If any of these are missing, ask the user for them before writing code. Use their values in dryrun commands and tests.

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
Sync Type (full or incremental):
Metadata JSON (if required):
API Reference URL:
```
