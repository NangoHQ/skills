#!/usr/bin/env node
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcSkillsDir = path.join(repoRoot, 'src', 'skills');
const includeRe = /^\s*<!--\s*include:\s*(.+?)\s*-->\s*$/;

async function buildSkill(skillName) {
    const templatePath = path.join(srcSkillsDir, skillName, 'SKILL.template.md');

    let template;
    try {
        template = await readFile(templatePath, 'utf8');
    } catch (err) {
        if (err?.code === 'ENOENT') {
            return false;
        }
        throw err;
    }

    const templateDir = path.dirname(templatePath);
    const lines = template.replace(/\r\n/g, '\n').split('\n');
    if (lines.length > 0 && lines[lines.length - 1] === '') {
        lines.pop();
    }

    let output = '';
    for (const line of lines) {
        const match = line.match(includeRe);
        if (!match) {
            output += `${line}\n`;
            continue;
        }

        const includePath = path.resolve(templateDir, match[1].trim());
        let included = await readFile(includePath, 'utf8');
        if (included.length > 0 && !included.endsWith('\n')) {
            included += '\n';
        }
        output += included;
    }

    const outPath = path.join(repoRoot, 'skills', skillName, 'SKILL.md');
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, output, 'utf8');
    console.log(`Built: ${path.relative(repoRoot, outPath)}`);
    return true;
}

const entries = await readdir(srcSkillsDir, { withFileTypes: true });
let builtAny = false;

for (const entry of entries) {
    if (!entry.isDirectory()) {
        continue;
    }

    builtAny ||= await buildSkill(entry.name);
}

if (!builtAny) {
    console.error('No skills built (missing src/skills/*/SKILL.template.md)');
    process.exit(1);
}
