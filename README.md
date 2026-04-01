# Nango Function Skills

This repository contains reusable skills for building and migrating Nango functions. It can be referenced by `skills.sh` or loaded directly as a Claude Code plugin.

Included skills:
- `building-nango-functions-locally` (`skills/building-nango-functions-locally/SKILL.md`)
- `migrating-nango-deletion-detection` (`skills/migrating-nango-deletion-detection/SKILL.md`)
- `migrating-to-zero-yaml` (`skills/migrating-to-zero-yaml/SKILL.md`)

## Claude Code plugin

Load the repository as a local plugin:

```bash
claude --plugin-dir .
```

The existing generated skills are exposed as namespaced Claude Code skills:

- `/nango:building-nango-functions-locally`
- `/nango:migrating-nango-deletion-detection`
- `/nango:migrating-to-zero-yaml`

If you update source files under `src/skills/`, rebuild the generated plugin skills with:

```bash
npm run build:skills
```
