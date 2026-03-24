## Required Inputs (Ask User if Missing)

Always:
- Integration ID (provider name)
- Connection ID (for running)
- Script name (kebab-case)
- API reference URL or sample response
- Metadata JSON if required

Action-specific:
- Use case summary
- Input parameters
- Output fields

Sync-specific:
- Model name (singular, PascalCase)
- Frequency (every hour, every 5 minutes, etc.)
- Checkpoint schema (timestamp, cursor, page token, offset/page, `since_id`, or composite)
- How the checkpoint changes the provider request or resume state
- Delete strategy (deleted-record endpoint/webhook, or why full refresh is required)
- If proposing a full refresh, the exact provider limitation that blocks checkpoints from the docs/sample response

If any required external values are missing, ask a targeted question after checking the repo and provider docs. For syncs, choose a checkpoint plus deletion strategy whenever the provider supports one. If you cannot find a viable checkpoint strategy, state exactly why before writing a full refresh.
