## Project Structure and Naming

```text
./
|-- .nango/
|-- index.ts
|-- hubspot/
|   |-- tools/
|   |   |-- create-contact.ts
|   |   `-- get-contact.ts
|   `-- syncs/
|       `-- fetch-contacts.ts
`-- slack/
    `-- tools/
        `-- post-message.ts
```

- Provider directories: lowercase (`hubspot`, `slack`)
- Tool files: kebab-case (`create-contact.ts`, `get-contact.ts`)
- Sync files: kebab-case (many teams use a `fetch-` prefix, but it is optional)
- One function per file
- All tools and syncs must be imported in `index.ts`

### Register scripts in `index.ts` (required)

Use side-effect imports only. Include the `.js` extension.

```typescript
// index.ts
import './github/tools/get-top-contributor.js';
import './github/tools/get-issue.js';
import './github/syncs/fetch-issues.js';
```

Symptom of incorrect registration: the file compiles but you see `No entry points found in index.ts...` or the function never appears.
