## Deploy (Optional)

Deploy functions to an environment in your Nango account:

```bash
nango deploy dev

# Deploy only one sync
nango deploy --sync <sync-name> dev

# Tools have no single-function flag: deploy their integration
nango deploy --integration <integration-id> dev
```

Reference: https://nango.dev/docs/reference/functions
