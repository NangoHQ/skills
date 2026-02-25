## Dryrun Command Reference

Default non-interactive flags (use these unless you have a reason not to):
- `-e dev --no-interactive --auto-confirm`

Basic syntax:

```
nango dryrun <script-name> <connection-id> [flags]
```

### Actions (always pass --input)

Validate:

```
nango dryrun <action-name> <connection-id> --validate -e dev --no-interactive --auto-confirm --input '{"key":"value"}'

# For no-input actions (input: z.object({}))
nango dryrun <action-name> <connection-id> --validate -e dev --no-interactive --auto-confirm --input '{}'
```

After validation passes, record mocks (generates `<action-name>.test.json`):

```
nango dryrun <action-name> <connection-id> --save -e dev --no-interactive --auto-confirm --input '{"key":"value"}'
```

### Syncs

Validate:

```
nango dryrun <sync-name> <connection-id> --validate -e dev --no-interactive --auto-confirm
```

After validation passes, record mocks (generates `<sync-name>.test.json`):

```
nango dryrun <sync-name> <connection-id> --save -e dev --no-interactive --auto-confirm
```

### Stub metadata (when your function calls nango.getMetadata())

```
# Action (still requires --input)
nango dryrun <action-name> <connection-id> --validate -e dev --no-interactive --auto-confirm --input '{}' --metadata '{"team_id":"123"}'

# Sync
nango dryrun <sync-name> <connection-id> --validate -e dev --no-interactive --auto-confirm --metadata @fixtures/metadata.json
```

Notes:
- Connection ID is the second positional argument (no `--connection-id` flag).
- Use `--integration-id <integration-id>` when script names overlap across integrations.
- Common flags: `--lastSyncDate "YYYY-MM-DD"`, `--variant <name>`.
- If you do not have `nango` on PATH, use `npx nango ...`.
- CLI upgrade prompts can block non-interactive runs. Workaround: set `NANGO_CLI_UPGRADE_MODE=ignore`.

Common mistakes:
- Using `--connection-id` (does not exist).
- Using legacy flags like `--save-responses` or `-m` (use `--save` and `--metadata`).
- Putting integration ID as the second argument (it will be interpreted as connection ID).
- Omitting `--input` for actions (always pass `--input`, even `{}`).
