## Project Structure and Naming

```text
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

- Provider directories: lowercase (`hubspot`, `slack`)
- Action files: kebab-case (`create-contact.ts`)
- Sync files: kebab-case (many teams use a `fetch-` prefix, but it is optional)
- One function per file
- All actions and syncs must be imported in `index.ts`

### Register scripts in `index.ts` (required)

Use side-effect imports only. Include the `.js` extension.

```typescript
// index.ts
import './github/actions/get-top-contributor.js';
import './github/syncs/fetch-issues.js';
```

Symptom of incorrect registration: the file compiles but you see `No entry points found in index.ts...` or the function never appears.
