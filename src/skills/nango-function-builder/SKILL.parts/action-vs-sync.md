## Decide: Action vs Sync

Action:
- One-time request, user-triggered
- CRUD operations and small lookups
- Thin API wrapper

Sync:
- Continuous data sync on a schedule
- Prefer checkpoint-based incremental syncs when the API exposes changes reliably
- Uses `batchSave()` / `batchDelete()` for incremental syncs
- Falls back to full refresh only when the API cannot reliably return changes or deletions
