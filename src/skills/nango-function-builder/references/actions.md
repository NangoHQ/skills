# Actions Reference

## Contents
- Base template
- Metadata
- CRUD patterns
- List actions
- ActionError
- Dryrun examples

## Base template

Notes:
- `input` is required even for no-input actions. Use `z.object({})`.
- Do not import `ActionError` as a value from `nango`. Throw `new nango.ActionError(payload)` using the `nango` exec parameter.
- `ProxyConfiguration` typing is optional. Only import it if you explicitly annotate a variable.

```typescript
import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('User ID. Example: "123"'),
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
            retries: 3
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

## Metadata

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

## CRUD patterns

| Operation | Method | Config pattern |
|-----------|--------|----------------|
| Create | `nango.post(config)` | `data: { properties: {...} }` |
| Read | `nango.get(config)` | `endpoint: resource/${id}`, `params: {...}` |
| Update | `nango.patch(config)` | `endpoint: resource/${id}`, `data: {...}` |
| Delete | `nango.delete(config)` | `endpoint: resource/${id}` |
| List | `nango.get(config)` | `params: {...}` plus pagination |

Recommended in most configs:
- Add an API doc link comment above the provider call.
- Set `retries` intentionally. `3` is common for idempotent GET/LIST calls; avoid retries for non-idempotent writes unless the API supports idempotency.

Optional input fields pattern:

```typescript
data: {
    required_field: input.required_field,
    ...(input.optional_field && { optional_field: input.optional_field })
}
```

## List actions

Expose pagination as `cursor` / `next_cursor` even when the provider uses a different name.

```typescript
const ListInput = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ListOutput = z.object({
    items: z.array(OutputSchema),
    next_cursor: z.union([z.string(), z.null()])
});

exec: async (nango, input): Promise<z.infer<typeof ListOutput>> => {
    const response = await nango.get({
        // https://api-docs-url
        endpoint: '/api/v1/users',
        params: {
            ...(input.cursor && { cursor: input.cursor })
        },
        retries: 3
    });

    return {
        items: response.data.items.map((item: { id: string; name: string | null }) => ({
            id: item.id,
            name: item.name
        })),
        next_cursor: response.data.next_cursor || null
    };
}
```

## ActionError

Use `nango.ActionError` for expected failures. Use standard `Error` for unexpected failures.

```typescript
if (response.status === 429) {
    throw new nango.ActionError({
        type: 'rate_limited',
        message: 'API rate limit exceeded',
        retry_after: response.headers['retry-after']
    });
}
```

Do not return null-filled objects to indicate not found. Throw `ActionError` instead.

## Dryrun examples

Validate an action:

```bash
nango dryrun <action-name> <connection-id> --validate -e dev --no-interactive --auto-confirm --input '{"key":"value"}'
```

Validate a no-input action:

```bash
nango dryrun <action-name> <connection-id> --validate -e dev --no-interactive --auto-confirm --input '{}'
```

Record mocks after validation passes:

```bash
nango dryrun <action-name> <connection-id> --save -e dev --no-interactive --auto-confirm --input '{"key":"value"}'
```

Stub metadata when needed:

```bash
nango dryrun <action-name> <connection-id> --validate -e dev --no-interactive --auto-confirm --input '{}' --metadata '{"team_id":"123"}'
```
