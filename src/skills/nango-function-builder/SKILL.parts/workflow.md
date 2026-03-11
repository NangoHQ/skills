## Workflow (recommended)
1. Decide whether this is an action or a sync.
2. Read the matching reference file: `references/actions.md` or `references/syncs.md`.
3. For syncs, inspect the provider docs or sample payloads for a checkpointable path first (`updated_at`, `modified_since`, changed-records endpoints, deleted-record endpoints, cursors, page tokens, offset/page, `since_id`, or webhooks) and complete the Sync Strategy Gate before writing code.
4. Gather required inputs and external values. If you need connection details, credentials, or discovery calls, use the Nango HTTP API (Connections/Proxy; auth with the Nango secret key). Do not invent Nango CLI token/connection commands.
5. Verify this is a Zero YAML TypeScript project (no `nango.yaml`) and you are in the Nango root (`.nango/` exists).
6. Create or update the function under `{integrationId}/actions/` or `{integrationId}/syncs/`, then register it in `index.ts`.
7. Validate with `nango dryrun ... --validate -e dev --no-interactive --auto-confirm`.
8. If validation cannot pass, stop and return early with the missing external state or inputs required.
9. After validation passes, run `nango dryrun ... --save`, then `nango generate:tests`, then `npm test`.
10. Deploy with `nango deploy dev` only when the task calls for deployment.
