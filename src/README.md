# Skill Sources

The source-of-truth for skills lives under `src/skills/*/`.

Each skill is assembled from:
- `src/skills/<skill>/SKILL.template.md`: a template that defines section order
- `src/skills/<skill>/SKILL.parts/*.md`: Markdown fragments included by the template

The official generated files are written to `skills/<skill>/SKILL.md`.

Build:

```bash
npm run build:skills
```

## Template includes

Use one include per line:

```md
<!-- include: ./SKILL.parts/<file>.md -->
```

Paths are resolved relative to the template file.

Any non-include lines in the template are copied through as-is (useful for blank lines between sections).
