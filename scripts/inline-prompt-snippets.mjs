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
const sourceMarkerPrefix = '<!-- prompt-source: ';
const sourceMarkerSuffix = ' -->';

const snippetPromptRegex =
  /<Prompt([^>]*)>\s*\n?\s*<Snippet file="([^"]+)"\s*\/>\s*\n?\s*<\/Prompt>/g;
const markedPromptRegex = new RegExp(
  `${sourceMarkerPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\s]+)${sourceMarkerSuffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n<Prompt([^>]*)>([\\s\\S]*?)<\\/Prompt>`,
  'g'
);

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

function readSnippetContent(snippetPath) {
  const snippetFile = path.join(docsRoot, snippetPath);

  if (!fs.existsSync(snippetFile)) {
    throw new Error(`Missing snippet: ${snippetFile}`);
  }

  return fs.readFileSync(snippetFile, 'utf8').trimEnd();
}

function buildPromptBlock(snippetPath, attrs, snippetContent) {
  return `${sourceMarkerPrefix}${snippetPath}${sourceMarkerSuffix}\n<Prompt${attrs}>\n${snippetContent}\n</Prompt>`;
}

function loadSnippetIndex() {
  const snippetsDir = path.join(docsRoot, 'snippets', 'prompts');
  const byContent = new Map();
  const byFirstLine = new Map();

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
        const relPath = path.relative(docsRoot, full).split(path.sep).join('/');
        const content = fs.readFileSync(full, 'utf8').trimEnd();
        const firstLine = content.split('\n')[0]?.trim();

        byContent.set(content, relPath);

        if (firstLine) {
          byFirstLine.set(firstLine, relPath);
        }
      }
    }
  }

  walk(snippetsDir);

  return { byContent, byFirstLine };
}

function resolveSnippetPath(body, snippetIndex) {
  const trimmedBody = body.trim();
  const exactMatch = snippetIndex.byContent.get(trimmedBody);

  if (exactMatch) {
    return exactMatch;
  }

  const firstLine = trimmedBody.split('\n')[0]?.trim();

  if (firstLine && snippetIndex.byFirstLine.has(firstLine)) {
    return snippetIndex.byFirstLine.get(firstLine);
  }

  return null;
}

function hasSourceMarkerBefore(content, offset) {
  const before = content.slice(Math.max(0, offset - 200), offset);

  return before.includes(sourceMarkerPrefix);
}

function addMissingSourceMarkers(content, snippetIndex) {
  return content.replace(/<Prompt([^>]*)>([\s\S]*?)<\/Prompt>/g, (match, attrs, body, offset) => {
    if (hasSourceMarkerBefore(content, offset)) {
      return match;
    }

    if (body.includes('<Snippet file=')) {
      return match;
    }

    const snippetPath = resolveSnippetPath(body, snippetIndex);

    if (!snippetPath) {
      return match;
    }

    try {
      const snippetContent = readSnippetContent(snippetPath);

      return buildPromptBlock(snippetPath, attrs, snippetContent);
    } catch {
      return match;
    }
  });
}

function syncPromptsInFile(file, snippetIndex) {
  let content = fs.readFileSync(file, 'utf8');
  let updated = content;
  let changed = false;
  let synced = 0;

  updated = updated.replace(snippetPromptRegex, (match, attrs, snippetPath) => {
    try {
      const snippetContent = readSnippetContent(snippetPath);
      synced++;
      changed = true;

      return buildPromptBlock(snippetPath, attrs, snippetContent);
    } catch (error) {
      console.error(`${error.message} (referenced in ${file})`);

      return match;
    }
  });

  updated = updated.replace(markedPromptRegex, (match, snippetPath, attrs) => {
    try {
      const snippetContent = readSnippetContent(snippetPath);
      synced++;
      changed = true;

      return buildPromptBlock(snippetPath, attrs, snippetContent);
    } catch (error) {
      console.error(`${error.message} (referenced in ${file})`);

      return match;
    }
  });

  const withMarkers = addMissingSourceMarkers(updated, snippetIndex);

  if (withMarkers !== updated) {
    updated = withMarkers;
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, updated);
    console.log(`Updated ${path.relative(repoRoot, file)}`);
  }

  return synced;
}

let totalSynced = 0;
const snippetIndex = loadSnippetIndex();

for (const file of findMdxFiles(docsRoot)) {
  const content = fs.readFileSync(file, 'utf8');

  if (!content.includes('<Prompt')) {
    continue;
  }

  totalSynced += syncPromptsInFile(file, snippetIndex);
}

console.log(`Synced ${totalSynced} prompt snippet(s).`);
