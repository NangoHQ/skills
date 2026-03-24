## Checklist

Before finishing:
- [ ] Provider validated with `GET /providers/{provider}` — no 404
- [ ] Existing integrations checked before offering to create a new one
- [ ] Credentials collected match the provider's `auth_mode` and `connection_configuration`
- [ ] `unique_key` confirmed with user before creation
- [ ] Integration created or updated successfully (HTTP 200)
- [ ] `unique_key` returned to user — they will need it for Nango connections and function calls
- [ ] For `API_KEY` / `BASIC` modes: user informed that credentials are provided at the connection level, not the integration level
