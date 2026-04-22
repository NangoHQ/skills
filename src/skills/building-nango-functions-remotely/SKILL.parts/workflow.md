## Workflow (required)
1. Decide whether this is an action or a sync.
2. Read the matching reference file: `references/actions.md` or `references/syncs.md`.
3. For syncs, inspect provider docs or payloads for checkpoints and deletes, decide whether the endpoint returns full data or changed rows, and complete the Sync Strategy Gate.
4. Gather required inputs and external values, including the `NANGO_SECRET_KEY` for the target environment and any metadata needed for dryrun.
5. Resolve the host from `NANGO_SERVER_URL` in the environment, then `.env`, then `https://api.nango.dev`.
6. Write or update the function as one self-contained TypeScript file using `createAction()` or `createSync()`.
7. Compile with `POST {host}/remote-function/compile` until compilation passes.
8. Dryrun with `POST {host}/remote-function/dryrun` using the target connection plus `input`, `metadata`, or `checkpoint` as needed.
9. If compile or dryrun cannot pass, stop and report the missing external state, inputs, or API contract mismatch.
10. Deploy with `POST {host}/remote-function/deploy` only when requested.
