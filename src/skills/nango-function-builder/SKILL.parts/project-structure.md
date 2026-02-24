## Project Structure and Naming

```
./
|-- .nango/
|-- index.ts
|-- hubspot/
|   |-- actions/
|   |   `-- create-contact.ts
|   `-- syncs/
|       `-- fetch-contacts.ts
`-- slack/
    `-- actions/
        `-- post-message.ts
```

- Provider directories: lowercase (hubspot, slack)
- Action files: kebab-case (create-contact.ts)
- Event handler files: kebab-case in `on-events/` (validate-connection.ts)
- Sync files: kebab-case (many teams use a `fetch-` prefix, but it's optional)
- One function per file (action, sync, or on-event)
- All actions, syncs, and on-event hooks must be imported in index.ts

### Register scripts in `index.ts` (required)

Use side-effect imports only (no default/named imports). Include the `.js` extension.

```typescript
// index.ts
import './github/actions/get-top-contributor.js';
import './github/syncs/fetch-issues.js';
import './github/on-events/validate-connection.js';
```

Symptom of incorrect registration: the file compiles but you see `No entry points found in index.ts...` or the function never appears.
