## Non-Negotiable Rules (Shared)

### Platform constraints (docs-backed)

- Zero YAML TypeScript projects do not use `nango.yaml`. Define functions with `createAction()`, `createSync()`, or `createOnEvent()`.
- Register every action/sync/on-event in `index.ts` via side-effect import (`import './<path>.js'`) or it will not load.
- You cannot install/import arbitrary third-party packages in Functions. Relative imports inside the Nango project are supported. Pre-included dependencies include `zod`, `crypto`/`node:crypto`, and `url`/`node:url`.
- Sync records must include a stable string `id`.
- Action outputs cannot exceed 2MB.
- `deleteRecordsFromPreviousExecutions()` is for full refresh syncs only. Call it only after you successfully fetched + saved the full dataset; do not swallow errors and still call it.
- HTTP request retries default to `0`. Set `retries` intentionally (and be careful retrying non-idempotent writes).

### Conventions (recommended)

- Prefer explicit parameter names (`user_id`, `channel_id`, `team_id`).
- Add `.describe()` examples for IDs, timestamps, enums, and URLs.
- Avoid `any`; use inline types when mapping responses.
- Prefer static Nango endpoint paths (avoid `:id` / `{id}` in the exposed endpoint); pass IDs in input/params.
- Add an API doc link comment above each provider API call.
- Standardize list actions on `cursor`/`next_cursor`.
- For optional outputs, return `null` only when the output schema models `null`.
- Use `nango.zodValidateInput()` when you need custom input validation/logging; otherwise rely on schemas + `nango dryrun --validate`.

Symptom of missing index.ts import: file compiles without errors but does not appear in the build output.

### Parameter Naming Rules

- IDs: suffix with _id (user_id, channel_id)
- Names: suffix with _name (channel_name)
- Emails: suffix with _email (user_email)
- URLs: suffix with _url (callback_url)
- Timestamps: use *_at or *_time (created_at, scheduled_time)

Mapping example (API expects a different parameter name):

```typescript
const InputSchema = z.object({
    user_id: z.string()
});

const config: ProxyConfiguration = {
    endpoint: 'users.info',
    params: {
        user: input.user_id
    },
    retries: 3
};
```
