## Preconditions (Do Before Writing Code)

### Confirm TypeScript Project (No nango.yaml)

This skill only supports TypeScript projects using createAction()/createSync()/createOnEvent().

```bash
ls nango.yaml 2>/dev/null && echo "YAML PROJECT DETECTED" || echo "OK - No nango.yaml"
```

If you see YAML PROJECT DETECTED:
- Stop immediately.
- Tell the user to upgrade to the TypeScript format first.
- Do not attempt to mix YAML and TypeScript.

Reference: https://nango.dev/docs/implementation-guides/platform/migrations/migrate-to-zero-yaml

### Verify Nango Project Root

Do not create files until you confirm the Nango root:

```bash
ls -la .nango/ 2>/dev/null && pwd && echo "IN NANGO PROJECT ROOT" || echo "NOT in Nango root"
```

If you see NOT in Nango root:
- cd into the directory that contains .nango/
- Re-run the check
- Do not use absolute paths as a workaround

All file paths must be relative to the Nango root. Creating files with extra prefixes while already in the Nango root will create nested directories that break the build.
