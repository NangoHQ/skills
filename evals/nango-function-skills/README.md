# Nango Function Skills Evals

These JSONL cases describe expected behavior for agents using the Nango plugin
Skills from Codex, Claude, Copilot, or another agent harness.

Each case keeps the plugin boundary explicit:

- the plugin is the installable package for an agent workspace
- each Skill is one focused `SKILL.md` workflow inside the plugin
- eval metadata may record sanitized plugin behavior only

Do not emit prompts, source file contents, connector payloads, OAuth tokens,
API keys, customer data, tool arguments, or model outputs as telemetry.

## Local Validation

```bash
while IFS= read -r line; do
  printf '%s\n' "$line" | jq -e . >/dev/null
done < evals/nango-function-skills/cases.jsonl
```

## Telvine Packaging

If this plugin is published through Telvine, use the package as the plugin and
the generated Nango Skills as plugin components:

```bash
npm i -g telvine
telvine login
telvine publish .
```
