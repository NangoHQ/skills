# Nango Function Skills

This repository contains reusable Skills for building and migrating Nango functions. It can be referenced by `skills.sh` or loaded directly as an agent plugin.

The plugin is the installable package for an agent workspace. A Skill is one capability inside that plugin, usually a focused `SKILL.md` workflow guide. This repository packages Nango Skills with plugin metadata so agents can use them consistently across Codex, Claude Code, and similar harnesses.

Included skills:
- `building-nango-functions` (`skills/building-nango-functions/SKILL.md`)
- `building-nango-functions-locally` (`skills/building-nango-functions-locally/SKILL.md`)
- `building-nango-functions-remotely` (`skills/building-nango-functions-remotely/SKILL.md`)
- `migrating-nango-deletion-detection` (`skills/migrating-nango-deletion-detection/SKILL.md`)
- `migrating-to-checkpoints` (`skills/migrating-to-checkpoints/SKILL.md`)
- `migrating-to-zero-yaml` (`skills/migrating-to-zero-yaml/SKILL.md`)
- `quickstart` (`skills/quickstart/SKILL.md`)

## Claude Code plugin

Load the repository as a local plugin:

```bash
claude --plugin-dir .
```

The existing generated skills are exposed as namespaced Claude Code skills:

- `/nango:building-nango-functions`
- `/nango:building-nango-functions-locally`
- `/nango:building-nango-functions-remotely`
- `/nango:migrating-nango-deletion-detection`
- `/nango:migrating-to-checkpoints`
- `/nango:migrating-to-zero-yaml`
- `/nango:quickstart`

If you update source files under `src/skills/`, rebuild the generated plugin skills with:

```bash
npm run build:skills
```

## Codex plugin

This repository also includes `.codex-plugin/plugin.json` so the same Nango
Skills can be installed as a Codex-compatible plugin. The plugin points at the
generated `skills/` directory and keeps Nango-specific workflow guidance inside
the individual `SKILL.md` files.

## Evals

Expected agent behavior is documented in `evals/nango-function-skills/cases.jsonl`.
These cases cover action planning, local sync debugging, and zero-yaml migration
review. They also document privacy boundaries for telemetry: do not emit prompts,
source file contents, connector payloads, OAuth tokens, API keys, customer data,
tool arguments, or model outputs.

## Telvine packaging

If this plugin is published through Telvine, publish the repository as the plugin
and treat each generated Nango Skill as a plugin component:

```bash
npm i -g telvine
telvine login
telvine publish .
```
