## Sync Template (createSync)

```typescript
import { createSync } from 'nango';
import { z } from 'zod';

const RecordSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()])
});

const sync = createSync({
    description: 'Brief single sentence',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/provider/records', group: 'Records' }],
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',

    models: {
        Record: RecordSchema
    },

    exec: async (nango) => {
        // Sync logic here
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
```

### Sync Deletion Detection

- Do not use trackDeletes. It is deprecated.
- Full syncs: call deleteRecordsFromPreviousExecutions at the end of exec after all batchSave calls.
- Incremental syncs: if the API supports it, detect deletions and call batchDelete.

Important: deletion detection is a soft delete. Records remain in the cache but are marked as deleted in metadata.

Safety: only call deleteRecordsFromPreviousExecutions when the run successfully fetched the full dataset. Do not catch and swallow errors and still call it (false deletions).

Reference: https://nango.dev/docs/implementation-guides/use-cases/syncs/deletion-detection

```typescript
await nango.deleteRecordsFromPreviousExecutions('Record');
```

### Full Sync (Recommended)

```typescript
exec: async (nango) => {
    const proxyConfig = {
        // https://api-docs-url
        endpoint: 'api/v1/records',
        paginate: { limit: 100 },
        retries: 3
    };

    for await (const batch of nango.paginate(proxyConfig)) {
        const records = batch.map((r: { id: string; name: string }) => ({
            id: r.id,
            name: r.name ?? null
        }));

        if (records.length > 0) {
            await nango.batchSave(records, 'Record');
        }
    }

    await nango.deleteRecordsFromPreviousExecutions('Record');
}
```

### Incremental Sync

```typescript
const sync = createSync({
    syncType: 'incremental',
    frequency: 'every 5 minutes',

    exec: async (nango) => {
        const lastSync = nango.lastSyncDate;

        const proxyConfig = {
            // https://api-docs-url
            endpoint: '/api/records',
            params: {
                sort: 'updated',
                ...(lastSync && { since: lastSync.toISOString() })
            },
            paginate: { limit: 100 },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const records = batch.map((record: { id: string; name?: string }) => ({
                id: record.id,
                name: record.name ?? null
            }));
            await nango.batchSave(records, 'Record');
        }

        if (lastSync) {
            const deleted = await nango.get({
                // https://api-docs-url
                endpoint: '/api/records/deleted',
                params: { since: lastSync.toISOString() },
                retries: 3
            });
            if (deleted.data.length > 0) {
                await nango.batchDelete(
                    deleted.data.map((d: { id: string }) => ({ id: d.id })),
                    'Record'
                );
            }
        }
    }
});
```

### Sync Metadata (When Required)

```typescript
const MetadataSchema = z.object({
    team_id: z.string()
});

const sync = createSync({
    metadata: MetadataSchema,

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const teamId = metadata?.team_id;

        if (!teamId) {
            throw new Error('team_id is required in metadata.');
        }

        const response = await nango.get({
            // https://api-docs-url
            endpoint: `/v1/teams/${teamId}/projects`,
            retries: 3
        });
    }
});
```

Note: nango.getMetadata() is cached for up to 60 seconds during a sync execution. Metadata updates may not be visible until the next run.

### Realtime Syncs (Webhooks)

Use webhookSubscriptions + onWebhook when the provider supports webhooks.

```typescript
const sync = createSync({
    webhookSubscriptions: ['contact.propertyChange'],

    exec: async (nango) => {
        // Optional periodic polling
    },

    onWebhook: async (nango, payload) => {
        if (payload.subscriptionType === 'contact.propertyChange') {
            const updated = {
                id: payload.objectId,
                [payload.propertyName]: payload.propertyValue
            };
            await nango.batchSave([updated], 'Contact');
        }
    }
});
```

Optional merge strategy:

```typescript
await nango.setMergingStrategy({ strategy: 'ignore_if_modified_after' }, 'Contact');
```

### Key SDK Methods (Sync)

| Method | Purpose |
|--------|---------|
| nango.paginate(config) | Iterate through paginated responses |
| nango.batchSave(records, model) | Save records to cache |
| nango.batchDelete(records, model) | Mark as deleted (incremental) |
| nango.deleteRecordsFromPreviousExecutions(model) | Auto-detect deletions (full) |
| nango.lastSyncDate | Last sync timestamp (incremental) |

### Pagination Helper (Advanced Config)

Nango preconfigures pagination for some APIs. Override when needed.

Pagination types: cursor, link, offset.

```typescript
const proxyConfig = {
    endpoint: '/tickets',
    paginate: {
        type: 'cursor',
        cursor_path_in_response: 'next',
        cursor_name_in_request: 'cursor',
        response_path: 'tickets',
        limit_name_in_request: 'limit',
        limit: 100
    },
    retries: 3
};

for await (const page of nango.paginate(proxyConfig)) {
    await nango.batchSave(page, 'Ticket');
}
```

Link pagination uses link_rel_in_response_header or link_path_in_response_body. Offset pagination uses offset_name_in_request.

### Manual Cursor-Based Pagination (If Needed)

```typescript
let cursor: string | undefined;
while (true) {
    const res = await nango.get({
        endpoint: '/api',
        params: { cursor },
        retries: 3
    });
    const records = res.data.items.map((item: { id: string; name?: string }) => ({
        id: item.id,
        name: item.name ?? null
    }));
    await nango.batchSave(records, 'Record');
    cursor = res.data.next_cursor;
    if (!cursor) break;
}
```
