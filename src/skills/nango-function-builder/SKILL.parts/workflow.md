## Workflow (recommended)
1. Decide whether this is an action or a sync.
2. Read the matching reference file: `references/actions.md` or `references/syncs.md`.
3. For syncs, inspect provider docs or payloads for checkpoints and deletes, decide whether the endpoint returns full data or changed rows, and complete the Sync Strategy Gate.
4. Gather required inputs and external values. For connection lookup, credentials, or discovery, use the Nango HTTP API.
5. Confirm this is a Zero YAML TypeScript project (`no nango.yaml`) and that you are in the Nango root (`.nango/` exists).
6. Create or update the function under `{integrationId}/actions/` or `{integrationId}/syncs/`, apply the schema and casing rules here, then register it in `index.ts`.
7. Validate with `nango dryrun ... --validate -e dev --no-interactive --auto-confirm`.
8. If validation cannot pass, stop and report the missing external state or inputs.
9. After validation passes, run `nango dryrun ... --save`, then `nango generate:tests`, then `npm test`.
10. Deploy with `nango deploy dev` only when requested.
