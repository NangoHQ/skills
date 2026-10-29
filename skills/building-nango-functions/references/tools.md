# Tools Reference

## Contents
- When to build a tool
- Limits
- Base template
- What `nango` can do in a tool
- Connection metadata
- List and batch tools
- Failures
- Files and folders
- Validation and execution

Verified against `nango` 0.71.14, the first release with `createTool()`.

## When to build a tool

A tool is one callable task with an input and an output, called by an agent or a developer through `POST /connections/:id/tools/:name/calls` or MCP. It is a Nango function with an HTTP trigger, built with `createTool()`.

- A call always waits for the result, for at most 2 minutes. A task that can't finish in 2 minutes is not a tool.
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

## Base template

Notes:
- `input` is required. For no-input tools, use `z.object({})`.
- `exec` receives `(nango, trigger)`: the input is `trigger.input`, not the second argument itself.
- `description` says what the tool does. `meta.instructions` tells the calling agent when to use it, which tool to use instead for a nearby task, what it needs first, and how to continue (for example, passing the next cursor back).
- The Schema and casing rules of `references/actions.md` apply to tools too.

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

Not available in a tool: `getMetadata`, `setMetadata`, `updateMetadata`, `batchSave` and other record methods, checkpoints, and `ActionError`.

The CRUD patterns, retries, and optional input fields pattern of `references/actions.md` apply unchanged.

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

## List and batch tools

Because a call has 2 minutes:

- A List or Search tool returns one page per call. Expose `cursor` and return the next cursor in the API's majority casing (`next_cursor`, `nextCursor`). Never fetch every page in one call. A provider response that returns the whole collection at once is one page without a next cursor.
- Expose a `limit` only when the provider accepts a page size; otherwise return the provider's page as it is.
- A Batch tool states the most items one call accepts, in its input schema (`.max(n)`) and its instructions. Choose a maximum one call can finish.

The List actions example in `references/actions.md` shows the cursor pattern; read the input from `trigger.input`.

## Failures

There is no error class for tools yet: `ActionError` is not part of a tool's `nango`.

- For an expected failure, such as a lookup that finds nothing, throw `new Error('<code>: <message>')` with a stable snake_case code, so the caller can tell failures apart by the message.
- Provider HTTP errors you don't handle reach an HTTP caller with the provider's status and body. Catch them when you can give a clearer code.
- Do not return null-filled objects to indicate not found.

## Files and folders

- Tool files go in `{integrationId}/tools/`, in kebab-case (`get-user.ts`).
- Register each tool in `index.ts` like any other function: `import './github/tools/get-user.js';`
- After `nango compile`, tools are listed in `.nango/functions.json` (not `.nango/nango.json`), with their description, tags (including `instructions` and `required_scopes`), and JSON Schemas.
- File uploads and downloads follow the proxy script rule of `references/actions.md`.

## Validation and execution

Validation, dryrun, mock recording, and deployment are workflow-specific. Use the active skill's workflow instructions for those steps. This shared reference only defines implementation patterns.
