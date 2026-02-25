## When API Docs Do Not Render

If web fetching returns incomplete docs (JS-rendered):
- Ask the user for a sample response
- Use existing actions/syncs in the repo as a pattern
 - Run dryrun with `--validate` until it passes, then run dryrun with `--save` to capture mocks, then run `nango generate:tests` to generate tests from the recorded response
