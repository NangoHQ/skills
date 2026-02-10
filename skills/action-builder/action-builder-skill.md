---
name: action-builder-skill
description: Use when creating or refactoring Nango integration actions to be thin API wrappers - provides patterns for minimal transformation logic, direct proxy calls, and standardized structure
---

# Nango Action Builder

## 🚨 REQUIRED: Invoke integration-patterns-skill First

**Before using this skill, you MUST invoke the `integration-patterns-skill` using the Skill tool.**

This dependency skill contains critical shared patterns for:
- Working directory detection (git root ≠ Nango root)
- Inline schema requirements (NOT from models.ts)
- `?? null` for optional fields
- Explicit parameter naming (`user_id` not `user`)
- Type safety (inline types, not `any`)
- No `.default()` on Zod schemas
- **index.ts registration requirement**
- Common mistakes table

**If you skip invoking it, you WILL miss critical checklist items and make mistakes.**

```
Use Skill tool: integration-patterns-skill
```

---

## 🚫 STOP: nango.yaml Detection

**This skill only works with TypeScript-based Nango projects (using `createAction()`/`createSync()`).**

Before proceeding, check if the project uses the legacy YAML configuration:

```bash
ls nango.yaml 2>/dev/null && echo "YAML PROJECT DETECTED" || echo "OK - No nango.yaml"
```

**If you see `YAML PROJECT DETECTED`:**

❌ **STOP. This skill cannot be used with YAML-based projects.**

Tell the user:
> "This project uses `nango.yaml` (legacy configuration). The action-builder-skill only supports TypeScript-based projects using `createAction()`. Please upgrade your project to the TypeScript format first. See: https://docs.nango.dev/guides/custom-integrations/setup"

**Do NOT attempt to:**
- Create actions in a YAML-based project
- Mix YAML and TypeScript action definitions
- Use `npx nango generate:tests` (it doesn't work with YAML projects)

---

## Overview

Actions are **thin API wrappers** using `createAction()`. This skill covers action-specific patterns only.

## When to Use

- Adding new API endpoint support
- Building CRUD operations (create, read, update, delete, list)
- **NOT for:** Complex business logic or multi-step workflows (use syncs)

## createAction() Structure

```typescript
import { z } from 'zod';
import { createAction, ActionError } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Schemas defined inline (see integration-patterns-skill)
const InputSchema = z.object({...});
const OutputSchema = z.object({...});

const action = createAction({
    description: 'Brief single sentence',  // No input params here
    version: '1.0.0',

    endpoint: {
        method: 'POST',           // GET, POST, PATCH, DELETE
        path: '/resource',        // Static path, NO :params or {params}
        group: 'ResourceGroup'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['required.scope'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api-docs-url
            endpoint: 'api/v1/resource',
            data: {...},          // For POST/PATCH
            params: {...},        // For GET
            retries: 3            // REQUIRED
        };

        const response = await nango.post(config);  // or .get, .patch, .delete

        // Handle expected failures with ActionError
        if (!response.data.results || response.data.results.length === 0) {
            throw new ActionError({
                type: 'not_found',
                message: 'Resource not found'
            });
        }

        return {
            // Transform response to match OutputSchema
            // Use ?? null for optional fields (see integration-patterns-skill)
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
```

## CRUD Methods

| Operation | Method | Config Pattern |
|-----------|--------|----------------|
| Create | `nango.post(config)` | `data: { properties: {...} }` |
| Read | `nango.get(config)` | `endpoint: 'resource/${id}'`, `params: {...}` |
| Update | `nango.patch(config)` | `endpoint: 'resource/${id}'`, `data: {...}` |
| Delete | `nango.delete(config)` | `endpoint: 'resource/${id}'` |
| List | `nango.get(config)` | `params: {...}` with pagination |

**Required in all configs:**
- `retries: 3`
- API doc link as comment above endpoint

**Optional fields pattern:**
```typescript
data: {
    required_field: input.required,
    ...(input.optional && { optional_field: input.optional })
}
```

## Error Handling: "Not Found" and Expected Failures

**Use `ActionError` for expected failures like "not found" scenarios.**

When a resource is not found or an expected failure occurs, use `ActionError` to return a structured error response. This prevents 500 errors and provides clear, actionable information to API consumers.

### Pattern: ActionError for "Not Found"

```typescript
import { createAction, ActionError } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Output schema - no need for nullable fields
const GetCompanyByDomainOutput = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    domain: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()])
});

// In exec function
exec: async (nango, input): Promise<z.infer<typeof GetCompanyByDomainOutput>> => {
    const config: ProxyConfiguration = {
        // https://developers.hubspot.com/docs/api/crm/search
        endpoint: 'crm/v3/objects/companies/search',
        data: {
            filterGroups: [...],
            properties: ['name', 'domain', 'createdate']
        },
        retries: 3
    };

    const response = await nango.post(config);

    // Use ActionError for not found scenarios
    if (!response.data.results || response.data.results.length === 0) {
        throw new ActionError({
            type: 'not_found',
            message: `No company found with domain: ${input.domain}`,
            domain: input.domain
        });
    }

    const company = response.data.results[0];
    return {
        id: company.id,
        name: company.properties.name ?? null,
        domain: company.properties.domain ?? null,
        created_at: company.properties.createdate ?? null
    };
}
```

**Response format when not found:**
```json
{
  "error_type": "action_script_failure",
  "payload": {
    "type": "not_found",
    "message": "No company found with domain: example.com",
    "domain": "example.com"
  }
}
```

### When to Use ActionError

Use `ActionError` for expected failures where you want to provide structured error information:
- **Not found scenarios**: Search returns no results, resource doesn't exist
- **Validation failures**: Business logic validation (e.g., "Cannot delete last admin")
- **Rate limiting**: API rate limit reached (with retry info)
- **Partial failures**: Some items succeeded, some failed (with details)

```typescript
// Example: Rate limit
if (response.status === 429) {
    throw new ActionError({
        type: 'rate_limited',
        message: 'API rate limit exceeded',
        retry_after: response.headers['retry-after']
    });
}

// Example: Validation failure
if (input.quantity > maxQuantity) {
    throw new ActionError({
        type: 'validation_error',
        message: `Quantity ${input.quantity} exceeds maximum ${maxQuantity}`,
        max_allowed: maxQuantity
    });
}
```

### When to Use Standard Errors

Use standard `throw new Error()` for unexpected failures:
- Authentication/authorization issues
- Network/timeout errors (though Nango handles retries)
- Unexpected API response structures
- Programming errors

```typescript
// Unexpected API structure
if (!response.data || typeof response.data.results === 'undefined') {
    throw new Error('Unexpected API response structure');
}
```

### ActionError vs Nullable Fields

**Prefer ActionError over nullable fields:**

❌ **Don't use nullable pattern:**
```typescript
// Unclear if null means "not found" or "no data"
if (!found) {
    return { id: null, name: null, email: null };
}
```

✅ **Do use ActionError:**
```typescript
// Clear, structured error information
if (!found) {
    throw new ActionError({
        type: 'not_found',
        message: 'User not found',
        user_id: input.user_id
    });
}
```

## Standard Pagination Interface

All list actions **MUST** use standardized `cursor`/`next_cursor` regardless of provider's native style.

### Schema Pattern

```typescript
const ListInput = z.object({
    cursor: z.string().optional()
        .describe('Pagination cursor from previous response. Omit for first page.')
});

const ListOutput = z.object({
    items: z.array(ItemSchema),
    next_cursor: z.union([z.string(), z.null()])  // null = no more pages
});
```

### Provider Mapping

| Provider | Native Input | Native Output | Map To |
|----------|--------------|---------------|--------|
| Slack | `cursor` | `response_metadata.next_cursor` | `cursor` → `next_cursor` |
| Notion | `start_cursor` | `next_cursor` | `cursor` → `next_cursor` |
| HubSpot | `after` | `paging.next.after` | `cursor` → `next_cursor` |
| GitHub | `page` | `Link` header | `cursor` → `next_cursor` |
| Google | `pageToken` | `nextPageToken` | `cursor` → `next_cursor` |

### Example

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

## Dryrun Command Syntax

**Exact syntax for action dryrun:**

```
npx nango dryrun <action-name> <connection-id> --input '<json>' --integration-id <provider>
                 ↑             ↑                ↑               ↑
                 │             │                │               └── Provider name (slack, hubspot, etc.)
                 │             │                └── JSON string with input params
                 │             └── Connection ID (positional, NOT a flag)
                 └── Action name (positional)
```

**Arguments breakdown:**
| Position/Flag | Example | Description |
|---------------|---------|-------------|
| 1st positional | `get-channel-info` | Action name (kebab-case) |
| 2nd positional | `action-builder` | Connection ID from user |
| `--input` | `'{"channel_id":"C123"}'` | JSON input (single quotes outside) |
| `--integration-id` | `slack` | Provider/integration name |

**Optional flags:**
- `--save-responses` - Save API response as mock
- `--validation` - Show detailed validation errors
- `--auto-confirm` - Skip confirmation prompts

### Common Dryrun Mistakes

❌ **WRONG - Using `--connection-id` flag (doesn't exist):**
```bash
npx nango dryrun get-company hubspot --connection-id abc123 --input '{}'
# Error: Integration "hubspot" does not exist
```

❌ **WRONG - Integration name as second argument:**
```bash
npx nango dryrun get-company hubspot --input '{}' --integration-id hubspot
# Error: Integration "hubspot" does not exist (hubspot is being read as connection ID)
```

✅ **CORRECT - Connection ID is positional (2nd arg):**
```bash
npx nango dryrun get-company abc123 --integration-id hubspot --input '{}'
#                            ↑ connection ID here (no flag!)
```

## After Creating an Action

**Follow this workflow after creating the action file:**

### 1. Register in index.ts
```typescript
// Add to index.ts
import './hubspot/actions/get-company-by-domain.js';
```

### 2. Run dryrun with --save-responses
```bash
npx nango dryrun <action-name> <connection-id> --integration-id <provider> --input '{"param":"value"}' --save-responses
```

This validates the action works and saves the API response for test mocks.

### 3. Generate tests
```bash
npx nango generate:tests -a <action-name> --integration-id <provider>

# Example:
npx nango generate:tests -a get-company-by-domain --integration-id hubspot
```

This creates test scaffolding in `{provider}/mocks/{action-name}/`.

### 4. Run tests
```bash
npx nango test -a <action-name> --integration-id <provider>
```

**Complete example workflow:**
```bash
# After creating hubspot/actions/get-company-by-domain.ts

# 1. Register (edit index.ts to add import)

# 2. Dryrun with saved responses
npx nango dryrun get-company-by-domain abc123 --integration-id hubspot --input '{"domain":"nango.dev"}' --save-responses

# 3. Generate tests
npx nango generate:tests -a get-company-by-domain --integration-id hubspot

# 4. Run tests
npx nango test -a get-company-by-domain --integration-id hubspot
```

## Using User-Provided Values

When the user provides test values (connection ID, IDs, etc.), use them:

1. **Connection ID** → Use in dryrun command
2. **Test input values** (channel ID, user ID, etc.) → Use in:
   - `input.json` mock file
   - `--input` flag for dryrun
3. **API reference URL** → Fetch for schema details

## When API Docs Don't Render

If WebFetch returns incomplete API docs (JavaScript-rendered content):

1. **Use common API patterns** - Most REST APIs return similar structures
2. **Ask the user** - "Can you provide a sample API response?"
3. **Run dryrun first** - Use `--save-responses` to capture real response, then build schema from it
4. **Check existing actions** - Look at similar actions in the codebase for patterns

## Mock Directory Structure

```
{integrationId}/mocks/
├── meta.json                    # {"connection_id": "my-connection"}
├── <action-name>/
│   ├── input.json               # Test input
│   ├── output.json              # Expected output
│   └── meta.json                # Action-level override (optional)
└── nango/<method>/proxy/<path>/
    └── <hash>.json              # API response from --save-responses
```

## Action-Specific Checklist

**Structure:**
- [ ] `createAction()` with description, version, endpoint, input/output, scopes
- [ ] Return type is `Promise<z.infer<typeof OutputSchema>>`
- [ ] `export type NangoActionLocal` and `export default action`

**Zod Schemas (CRITICAL):**
- [ ] **NO `.default()` in any schema** - Nango compiler doesn't support it. Handle defaults in exec function instead.

**ProxyConfiguration:**
- [ ] `retries: 3` configured
- [ ] API doc link comment above endpoint
- [ ] Uses `input` directly (no `zodValidateInput`)

**Error Handling:**
- [ ] Import `ActionError` from 'nango' for expected failures
- [ ] "Not found" scenarios use `ActionError` with descriptive payload
- [ ] ActionError includes `type` field for error categorization
- [ ] Standard errors (`throw new Error()`) only for unexpected failures

**Pagination (list actions only):**
- [ ] Input uses `cursor: z.string().optional()`
- [ ] Output uses `next_cursor: z.union([z.string(), z.null()])`

**See `integration-patterns-skill` for:** schema, naming, typing, path, and **index.ts registration** checklist items.

## Action-Specific Mistakes

| Mistake | Why It Fails | Fix |
|---------|--------------|-----|
| Using standard `Error` for "not found" | Unclear error type, no structure | Use `ActionError` with type/message/context |
| Not importing `ActionError` | Cannot use structured errors | Add to imports: `import { createAction, ActionError }` |
| Missing `retries: 3` | Flaky network calls fail | Add to ProxyConfiguration |
| Wrong return type | Type mismatch errors | Use `Promise<z.infer<typeof OutputSchema>>` |
| Using `zodValidateInput` | Returns undefined, already validated | Use `input` directly |
| Provider-specific pagination | Inconsistent API | Use `cursor`/`next_cursor` standard |
| Importing mapper functions | Not self-contained | Inline transformations in exec |

**For schema, naming, typing, registration mistakes → invoke `integration-patterns-skill`**
