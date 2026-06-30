#!/usr/bin/env node
/**
 * Inlines docs/snippets/prompts/*.mdx content into <Prompt> components.
 *
 * Mintlify copies <Prompt> children verbatim, so <Snippet /> tags are copied
 * as JSX instead of the prompt text. Edit snippet files, then run:
 *
 *   node scripts/inline-prompt-snippets.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsRoot = path.join(repoRoot, 'docs');
const promptSnippetRegex =
  /<Prompt([^>]*)>\s*\n?\s*<Snippet file="([^"]+)"\s*\/>\s*\n?\s*<\/Prompt>/g;

function findMdxFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory() && entry.name !== 'node_modules') {
      findMdxFiles(full, files);
    } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
      files.push(full);
    }
  }

  return files;
}

let inlined = 0;

for (const file of findMdxFiles(docsRoot)) {
  const content = fs.readFileSync(file, 'utf8');

  if (!content.includes('<Snippet file=') || !content.includes('<Prompt')) {
    continue;
  }

  const updated = content.replace(promptSnippetRegex, (match, attrs, snippetPath) => {
    const snippetFile = path.join(docsRoot, snippetPath);

    if (!fs.existsSync(snippetFile)) {
      console.error(`Missing snippet: ${snippetFile} (referenced in ${file})`);

      return match;
    }

    const snippetContent = fs.readFileSync(snippetFile, 'utf8').trimEnd();
    inlined++;

    return `<Prompt${attrs}>\n${snippetContent}\n</Prompt>`;
  });

  if (updated !== content) {
    fs.writeFileSync(file, updated);
    console.log(`Updated ${path.relative(repoRoot, file)}`);
  }
}

console.log(`Inlined ${inlined} prompt snippet(s).`);
