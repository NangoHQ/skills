## API Authentication

All Nango API calls require a Bearer token and a base URL.

**Secret key:** Check `NANGO_SECRET_KEY` in the environment first. If unset, ask the user: "What is your Nango secret key?"

**Base URL:** Check `NANGO_BASE_URL` in the environment. If unset, default to `https://api.nango.dev`.

Use on every request:
```
Authorization: Bearer <secret_key>
Content-Type: application/json
```
