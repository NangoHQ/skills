## Dryrun Command Reference

Basic syntax (action or sync):

```
nango dryrun <script-name> <connection-id>
```

Actions: pass input:

```
nango dryrun <action-name> <connection-id> --input '{"key":"value"}'

# For actions with input: z.object({})
nango dryrun <action-name> <connection-id> --input '{}'
```

Stub metadata (when your function calls nango.getMetadata()):

```
nango dryrun <script-name> <connection-id> --metadata '{"team_id":"123"}'
nango dryrun <script-name> <connection-id> --metadata @fixtures/metadata.json
```

Save mocks for tests (implies validation; only saves if validation passes):

```
nango dryrun <script-name> <connection-id> --save
```

Notes:
- Connection ID is the second positional argument (no `--connection-id` flag).
- Use `--integration-id <integration-id>` when script names overlap across integrations.
- Common flags: `--validate`, `-e/--environment dev|prod`, `--no-interactive`, `--auto-confirm`, `--lastSyncDate "YYYY-MM-DD"`, `--variant <name>`.
- If you do not have `nango` on PATH, use `npx nango ...`.
- In CI/non-interactive runs always pass `-e dev|prod` (otherwise the CLI prompts for environment selection).
- CLI upgrade prompts can block non-interactive runs. Workaround: set `NANGO_CLI_UPGRADE_MODE=ignore`.

Common mistakes:
- Using `--connection-id` (does not exist)
- Using legacy flags like `--save-responses` or `-m` (use `--save` and `--metadata`)
- Putting integration ID as the second argument (it will be interpreted as connection ID)
