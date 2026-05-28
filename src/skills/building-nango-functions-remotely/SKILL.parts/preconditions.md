## Preconditions (Do Before Writing Code)

- No checked-out Nango project is required.
- Resolve `NANGO_SERVER_URL` in this order: environment variable, `.env` file, then fallback to `https://api.nango.dev`.
- Resolve `NANGO_SECRET_KEY` before calling remote endpoints.
- Use the environment bound to that secret key.
- Keep the function self-contained in one TypeScript file unless you have direct evidence that the remote endpoint accepts multi-file payloads.
