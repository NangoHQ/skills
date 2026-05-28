## Preconditions (Do Before Writing Code)

- No checked-out Nango project is required.
- Resolve `NANGO_SERVER_URL` in this order: environment variable, `.env` file, then fallback to `https://api.nango.dev`.
- Resolve `NANGO_SECRET_KEY` before calling function endpoints.
- Use the environment bound to that secret key.
- Confirm the key has the needed scope: `environment:functions:compile` for compile, `environment:functions:dryrun` for dryrun and polling, and `environment:deploy` for deployment. Full-access environment keys satisfy all three.
- Keep the function self-contained in one TypeScript file unless you have direct evidence that the remote endpoint accepts multi-file payloads.
