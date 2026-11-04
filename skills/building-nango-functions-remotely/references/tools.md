# Tools Reference

## Contents
- When to build a tool
- Limits
- Schema and casing rules
- Base template
- What `nango` can do in a tool
- Connection metadata
- CRUD patterns
- List and batch tools
- Failures
- Files and folders
- File handling — use proxy scripts, not tools
- Validation and execution

Verified against `nango` 0.71.14, the first release with `createTool()`.

## When to build a tool

A tool is one callable task with an input and an output, called by an agent or a developer through `POST /connections/:id/tools/:name/calls` or MCP. It is a Nango function with an HTTP trigger, built with `createTool()`.

- A call always waits for the result, for at most 2 minutes. A task that can't finish in 2 minutes is not a tool.
- A tool's output cannot exceed 2 MB.
- A tool runs against one connection. It can read the connection but has no records, no checkpoints, and no metadata writes.

## Limits

These are checked by `nango compile`:

| Field | Rule |
|-------|------|
| `name` | Optional; defaults to the file name. Letters, digits, `_`, and `-`, at most 64 characters. |
| `description` | Required. |
| `meta.instructions` | At most 1,024 characters. |
| `meta.requiredScopes` | At most 64 scopes of at most 64 characters each. Indicative only: Nango does not enforce them. |
| `meta.tags` | At most 30. Keys match `^[a-z][a-z0-9_\-./]*$` (at most 64 characters); values are a string, or a list of strings, of at most 64 characters. `instructions` and `required_scopes` are reserved keys. |

`createTool()` has no `version`, `scopes`, `endpoint`, or `metadata` field.

## Schema and casing rules

- Default non-required inputs to `.optional()`.
- If `null` means "clear this value", use `.nullable().optional()` and document it.
- Raw provider schemas should match the provider: `.optional()` for omitted fields, `.nullable()` for explicit `null`, `.nullish()` only when the provider truly does both.
- Final outputs should prefer `.optional()` and normalize upstream `null` to omission unless `null` matters.
- Passthrough fields keep provider casing. Derived fields should follow the majority casing of that API.
- Prefer `.nullable()` over `z.union([z.null(), T])` or `z.union([T, z.null()])`.

## Base template

Notes:
- `input` is required. For no-input tools, use `z.object({})`.
- `exec` receives `(nango, trigger)`: the input is `trigger.input`, not the second argument itself.
- `description` says what the tool does. `meta.instructions` tells the calling agent when to use it, which tool to use instead for a nearby task, what it needs first, and how to continue (for example, passing the next cursor back).
- Import `ProxyConfiguration` only if you annotate a variable.
- This example uses snake_case. Rename fields for camelCase APIs.

```typescript
import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('User ID. Example: "123"')
    // For no-input tools use: z.object({})
});

const ProviderUserSchema = z.object({
    id: z.string(),
    name: z.string().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const tool = createTool({
    name: 'get-user',
    description: 'Get one user by ID.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions: 'Use for one known user ID. Use `list-users` to find an ID first.',
        requiredScopes: ['users:read'],
        tags: { read_only_hint: 'true' }
    },

    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;
        const response = await nango.get({
            // https://api-docs-url
            endpoint: `/api/v1/users/${encodeURIComponent(input.user_id)}`,
            retries: 3
        });

        const providerUser = ProviderUserSchema.parse(response.data);

        return {
            id: providerUser.id,
            ...(providerUser.name != null && { name: providerUser.name })
        };
    }
});

export default tool;
```

## What `nango` can do in a tool

| Available | Methods |
|-----------|---------|
| Logging and environment | `log`, `getEnvironmentVariables` |
| The connection | `getConnection`, `getToken`, `getIntegration`, `getVariant` |
| Provider calls | `get`, `post`, `put`, `patch`, `delete`, `paginate`, `proxy`, `uncontrolledFetch` |

Not available in a tool: `getMetadata`, `setMetadata`, `updateMetadata`, `batchSave` and other record methods, checkpoints, and an error class.

## Connection metadata

A tool can read the connection's metadata but not write it. `getConnection()` returns the whole connection, with `metadata` as an untyped record. Parse it with Zod:

```typescript
const MetadataSchema = z.object({
    team_id: z.string()
});

exec: async (nango, trigger) => {
    const connection = await nango.getConnection();
    const metadata = MetadataSchema.safeParse(connection.metadata ?? {});

    if (!metadata.success) {
        throw new Error('invalid_metadata: team_id is required in the connection metadata.');
    }

    const teamId = metadata.data.team_id;
    // ...
}
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
- Set `retries` intentionally. `3` is the normal maximum for idempotent GET/LIST calls; values above `3` are strongly discouraged and need a documented reason. Avoid retries for non-idempotent writes unless the API supports idempotency.

Optional input fields pattern:

```typescript
const InputSchema = z.object({
    required_field: z.string(),
    optional_field: z.string().optional(),
    clearable_field: z.string().nullable().optional()
});

const input = trigger.input;

data: {
    required_field: input.required_field,
    ...(input.optional_field !== undefined && { optional_field: input.optional_field }),
    ...(input.clearable_field !== undefined && { clearable_field: input.clearable_field })
}
```

Use `!== undefined` so empty strings, `false`, and `0` are preserved.

## List and batch tools

Because a call has 2 minutes:

- A List or Search tool returns one page per call. Never fetch every page in one call. A provider response that returns the whole collection at once is one page without a next cursor.
- Expose `cursor` and return the next cursor in the API's majority casing (`next_cursor`, `nextCursor`).
- Expose a `limit` only when the provider accepts a page size; otherwise return the provider's page as it is.
- A Batch tool states the most items one call accepts, in its input schema (`.max(n)`) and its instructions. Choose a maximum one call can finish.

This example uses `next_cursor`; use `nextCursor` for camelCase APIs.

```typescript
const ListInput = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ListOutput = z.object({
    items: z.array(OutputSchema),
    next_cursor: z.string().optional()
});

exec: async (nango, trigger): Promise<z.infer<typeof ListOutput>> => {
    const input = trigger.input;
    const response = await nango.get({
        // https://api-docs-url
        endpoint: '/api/v1/users',
        params: {
            ...(input.cursor && { cursor: input.cursor })
        },
        retries: 3
    });

    return {
        items: response.data.items.map((item: { id: string; name?: string | null }) => ({
            id: item.id,
            ...(item.name != null && { name: item.name })
        })),
        ...(response.data.next_cursor != null && { next_cursor: response.data.next_cursor })
    };
}
```

## Failures

A tool's `nango` has no error class yet.

- For an expected failure, such as a lookup that finds nothing, throw `new Error('<code>: <message>')` with a stable snake_case code, so the caller can tell failures apart by the message.
- Provider HTTP errors you don't handle reach an HTTP caller with the provider's status and body. Catch them when you can give a clearer code.
- Do not return null-filled objects to indicate not found.

```typescript
if (response.status === 429) {
    throw new Error('rate_limited: The API rate limit was exceeded. Retry after the Retry-After interval.');
}
```

## Files and folders

- Tool files go in `{integrationId}/tools/`, in kebab-case (`get-user.ts`).
- Register each tool in `index.ts` like any other function: `import './github/tools/get-user.js';`
- After `nango compile`, tools are listed in `.nango/functions.json` (not `.nango/nango.json`), with their description, tags (including `instructions` and `required_scopes`), and JSON Schemas.

## File handling — use proxy scripts, not tools

File uploads and downloads **must not be implemented as Nango tools**. Both are inherently client-side operations that belong in **proxy scripts** (`{integration}/proxy/`) using `@nangohq/node`.

**Why tools cannot handle files:**
- Tools run in Nango's sandboxed cloud runtime with no `fs`, no `axios`, and no native `FormData`/`Blob`
- Uploads would require manual multipart boundary construction and `uncontrolledFetch` workarounds
- Downloads of large or binary content exceed the 2 MB output limit

**Use a proxy script when:**
- Uploading files (multipart/form-data, FormData, Blob) — `nango.post({ data: formData })` works directly via axios
- Downloading large or binary content — response is streamed/processed in the caller's stack
- Fetching documents, attachments, or any content the caller needs to handle directly

**Structure:**
```
{integration}/
  proxy/
    upload-file.ts      # or fetch-document.ts, download-attachment.ts, etc.
```

Each proxy script initializes `new Nango({ secretKey: ... })` and calls `nango.get/post/...` directly. Auth injection still happens server-side through the Nango proxy.

If asked to build a tool for file upload or download, create a proxy script instead.

## Validation and execution

Validation, dryrun, mock recording, and deployment are workflow-specific. Use the active skill's workflow instructions for those steps. This shared reference only defines implementation patterns.
