## Decide: Action vs Sync

Action:
- One-time request, user-triggered
- CRUD operations and small lookups
- Thin API wrapper

Sync:
- Continuous data sync on a schedule
- Fetches all records or incremental changes
- Uses batchSave/batchDelete
