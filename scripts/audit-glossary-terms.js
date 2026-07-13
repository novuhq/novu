#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const docsRoot = path.join(__dirname, '..', 'docs');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === '.mintlify' || entry.name === 'snippets') {
        continue;
      }

      walk(fullPath, files);
      continue;
    }

    if (entry.name.endsWith('.mdx')) {
      files.push(fullPath);
    }
  }

  return files;
}

const issues = [];

for (const filePath of walk(docsRoot)) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(docsRoot, filePath);

  if (content.includes('<GlossaryTerm')) {
    issues.push(`${relativePath}: contains <GlossaryTerm> — expand with node scripts/expand-glossary-tooltips.js`);
  }

  if (content.match(/\[.*?\]\(\/platform\/additional-resources\/glossary#/)) {
    issues.push(`${relativePath}: contains inline glossary markdown link — use <Tooltip> instead`);
  }

  if (content.includes("from '/snippets/glossary-term.jsx'")) {
    issues.push(`${relativePath}: imports removed glossary-term.jsx snippet`);
  }
}

if (issues.length === 0) {
  console.log('Glossary tooltip audit passed.');
  process.exit(0);
}

console.log('Glossary tooltip audit found issues:\n');
for (const issue of issues) {
  console.log(`- ${issue}`);
}

process.exit(1);
