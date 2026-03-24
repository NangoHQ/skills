## Workflow (recommended)
1. Check if an integration exists or if it needs to be created or updated
2. Check if a connection exists
3. Decide whether this is an action or a sync.
4. Read the matching reference file: `references/actions.md` or `references/syncs.md`.
5. For syncs, inspect the provider docs or sample payloads for a checkpointable path first (`updated_at`, `modified_since`, changed-records endpoints, deleted-record endpoints, cursors, page tokens, offset/page, `since_id`, or webhooks), decide whether it returns the full dataset or only changed rows, and complete the Sync Strategy Gate before writing code.
6. Gather required inputs and external values. If you need connection details, credentials, or discovery calls, use the Nango HTTP API (Connections/Proxy; auth with the Nango secret key). Do not invent Nango CLI token/connection commands.
7. Always assume this will be a Zero YAML TypeScript project (no `nango.yaml`) and you are in the Nango root (`.nango/` exists).
8. You shouldn't use the local file system, we are creating the function remotely. Create or update the function by using the Nango Remote build API. This will require to keep the sync/action to a single file, as the API only accepts 1 file. Use the create 
9. Once the function is deployed, run it.
10. Report to the user the result, if something went wrong on either the build or the run, fix it and retry.
