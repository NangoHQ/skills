## Create Integration

```
POST {base_url}/integrations
Authorization: Bearer <secret_key>
Content-Type: application/json

{
  "unique_key": "<confirmed_unique_key>",
  "provider": "<provider>",
  "credentials": { ... }
}
```

Omit `credentials` for `API_KEY` and `BASIC` auth modes.

On **200**: the integration was created. Show the user:
- `unique_key` — they will need this for Nango connections and function calls
- `provider`
- `created_at`

On **400**: surface the full error body. Common causes: `unique_key` already exists, missing or invalid credential fields. Ask the user to correct and retry.

On **401**: the secret key is invalid or expired. Ask the user to re-provide `NANGO_SECRET_KEY`.
