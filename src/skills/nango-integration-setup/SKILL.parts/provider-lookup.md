## Provider Lookup

Fetch provider details before collecting credentials:

```
GET {base_url}/providers/{provider}
```

Extract from the response:
- `auth_mode`: determines which credential fields are required
- `display_name`: use in prompts to the user
- `connection_configuration`: additional required setup fields beyond the standard auth credentials

If the provider is not found (404), tell the user and ask for the correct provider identifier. Valid provider names are the short slugs used in Nango (e.g. `hubspot`, `github`, `google-drive`, `linear`). You can list all providers with `GET {base_url}/providers` if the user is unsure.
