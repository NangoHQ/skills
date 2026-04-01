#!/usr/bin/env node
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcSkillsDir = path.join(repoRoot, 'src', 'skills');
const includeRe = /^\s*<!--\s*include:\s*(.+?)\s*-->\s*$/;

async function copyDir(srcDir, destDir) {
    let entries;

    try {
        entries = await readdir(srcDir, { withFileTypes: true });
    } catch (err) {
        if (err?.code === 'ENOENT') {
            return false;
        }

        throw err;
    }

    await mkdir(destDir, { recursive: true });

    for (const entry of entries) {
        const srcPath = path.join(srcDir, entry.name);
        const destPath = path.join(destDir, entry.name);

        if (entry.isDirectory()) {
            await copyDir(srcPath, destPath);
            continue;
        }

        if (entry.isFile()) {
            await copyFile(srcPath, destPath);
        }
    }

    return true;
}

async function readReferenceSources(skillDir) {
    const manifestPath = path.join(skillDir, 'references.sources');

    let manifest;
    try {
        manifest = await readFile(manifestPath, 'utf8');
    } catch (err) {
        if (err?.code === 'ENOENT') {
            return [];
        }

        throw err;
    }

    return manifest
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'))
        .map((line) => path.resolve(skillDir, line));
}

async function buildSkill(skillName) {
    const skillSrcDir = path.join(srcSkillsDir, skillName);
    const templatePath = path.join(skillSrcDir, 'SKILL.template.md');

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

    const skillOutDir = path.join(repoRoot, 'skills', skillName);
    const outPath = path.join(skillOutDir, 'SKILL.md');
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, output, 'utf8');

    const outReferencesDir = path.join(skillOutDir, 'references');
    await rm(outReferencesDir, { recursive: true, force: true });

    let copiedReferences = false;

    for (const sourceDir of await readReferenceSources(skillSrcDir)) {
        copiedReferences = (await copyDir(sourceDir, outReferencesDir)) || copiedReferences;
    }

    copiedReferences = (await copyDir(path.join(skillSrcDir, 'references'), outReferencesDir)) || copiedReferences;

    console.log(`Built: ${path.relative(repoRoot, outPath)}`);

    if (copiedReferences) {
        console.log(`Copied: ${path.relative(repoRoot, outReferencesDir)}`);
    }

    return true;
}

const entries = await readdir(srcSkillsDir, { withFileTypes: true });
let builtAny = false;

for (const entry of entries) {
    if (!entry.isDirectory()) {
        continue;
    }

    if (entry.name.startsWith('_')) {
        continue;
    }

    const built = await buildSkill(entry.name);
    builtAny = builtAny || built;
}

if (!builtAny) {
    console.error('No skills built (missing src/skills/*/SKILL.template.md)');
    process.exit(1);
}
