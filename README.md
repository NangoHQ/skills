# Nango Function Skills

This repository contains reusable skills for building Nango functions. It can be referenced by `skills.sh` or loaded directly as a Claude Code plugin.

Included skills:
- `building-nango-functions-locally` (`skills/building-nango-functions-locally/SKILL.md`)
- `building-nango-functions-remotely` (`skills/building-nango-functions-remotely/SKILL.md`)
- `migrate-nango-deletion-detection` (`skills/migrate-nango-deletion-detection/SKILL.md`)

## Claude Code plugin

Load the repository as a local plugin:

```bash
claude --plugin-dir .
```

The existing generated skills are exposed as namespaced Claude Code skills:

- `/nango:building-nango-functions-locally`
- `/nango:building-nango-functions-remotely`
- `/nango:migrate-nango-deletion-detection`

If you update source files under `src/skills/`, rebuild the generated plugin skills with:

```bash
npm run build:skills
```
