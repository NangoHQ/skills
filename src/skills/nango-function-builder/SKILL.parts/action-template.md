## Action Template (createAction)

Notes:
- `input` is required even for "no input" actions. Use `z.object({})`.
- Do not import `ActionError` as a value from `nango` (it is a type-only export in recent versions). Throw `new nango.ActionError(payload)` using the `nango` exec parameter.
- `ProxyConfiguration` typing is optional. Only import it if you explicitly annotate a variable.

```typescript
import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('User ID. Example: "123"')
    // For no-input actions use: z.object({})
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'Brief single sentence',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/user',
        group: 'Users'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['required.scope'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://api-docs-url
            endpoint: '/api/v1/users',
            params: {
                userId: input.user_id
            },
            retries: 3 // safe for idempotent GETs; be careful retrying non-idempotent writes
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found',
                user_id: input.user_id
            });
        }

        return {
            id: response.data.id,
            name: response.data.name ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
```

### Action Metadata (When Required)

Use metadata when the action depends on connection-specific values.

```typescript
const MetadataSchema = z.object({
    team_id: z.string()
});

const action = createAction({
    metadata: MetadataSchema,

    exec: async (nango, input) => {
        const metadata = await nango.getMetadata<{ team_id?: string }>();
        const teamId = metadata?.team_id;

        if (!teamId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'team_id is required in metadata.'
            });
        }
    }
});
```

### Action CRUD Patterns

| Operation | Method | Config Pattern |
|-----------|--------|----------------|
| Create | nango.post(config) | data: { properties: {...} } |
| Read | nango.get(config) | endpoint: `resource/${id}`, params: {...} |
| Update | nango.patch(config) | endpoint: `resource/${id}`, data: {...} |
| Delete | nango.delete(config) | endpoint: `resource/${id}` |
| List | nango.get(config) | params: {...} with pagination |

Note: These endpoint examples are for ProxyConfiguration (provider API). The createAction endpoint path must stay static.

Recommended in most configs:
- API doc link comment above endpoint
- retries: set intentionally (often `3` for idempotent GET/LIST; avoid retries for non-idempotent POST unless the API supports idempotency)

Optional input fields pattern:

```typescript
data: {
    required_field: input.required_field,
    ...(input.optional_field && { optional_field: input.optional_field })
}
```

### Action Error Handling (ActionError)

Use ActionError for expected failures (not found, validation, rate limit). Use standard Error for unexpected failures.

```typescript
if (response.status === 429) {
    throw new nango.ActionError({
        type: 'rate_limited',
        message: 'API rate limit exceeded',
        retry_after: response.headers['retry-after']
    });
}
```

Do not return null-filled objects to indicate "not found". Use ActionError instead.

ActionError response format:

```json
{
  "error_type": "action_script_failure",
  "payload": {
    "type": "not_found",
    "message": "User not found",
    "user_id": "123"
  }
}
```

### Action Pagination Standard (List Actions)

All list actions must use cursor/next_cursor regardless of provider naming.

Schema pattern:

```typescript
const ListInput = z.object({
    cursor: z.string().optional().describe('Pagination cursor from previous response. Omit for first page.')
});

const ListOutput = z.object({
    items: z.array(ItemSchema),
    next_cursor: z.union([z.string(), z.null()])
});
```

Provider mapping:

| Provider | Native Input | Native Output | Map To |
|----------|--------------|---------------|--------|
| Slack | cursor | response_metadata.next_cursor | cursor -> next_cursor |
| Notion | start_cursor | next_cursor | cursor -> next_cursor |
| HubSpot | after | paging.next.after | cursor -> next_cursor |
| GitHub | page | Link header | cursor -> next_cursor |
| Google | pageToken | nextPageToken | cursor -> next_cursor |

Example:

```typescript
exec: async (nango, input): Promise<z.infer<typeof ListOutput>> => {
    const config: ProxyConfiguration = {
        endpoint: 'api/items',
        params: {
            ...(input.cursor && { cursor: input.cursor })
        },
        retries: 3
    };

    const response = await nango.get(config);

    return {
        items: response.data.items.map((item: { id: string; name: string }) => ({
            id: item.id,
            name: item.name
        })),
        next_cursor: response.data.next_cursor || null
    };
}
```
