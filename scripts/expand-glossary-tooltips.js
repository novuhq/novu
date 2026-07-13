#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const glossaryTerms = require('./glossary-terms-data');
const docsRoot = path.join(__dirname, '..', 'docs');

const glossaryTermPattern =
  /<GlossaryTerm\s+term="([^"]+)"(?:\s+cta="([^"]*)")?(?:\s+href="([^"]*)")?\s*>([\s\S]*?)<\/GlossaryTerm>/g;

function escapeAttr(value) {
  return value.replace(/"/g, '&quot;');
}

function buildTooltipMarkup(term, children, ctaOverride, hrefOverride) {
  const entry = glossaryTerms[term];

  if (!entry) {
    console.warn(`Unknown glossary term: ${term}`);
    return children;
  }

  const cta = ctaOverride || entry.cta;
  const href = hrefOverride || entry.href;
  const headline = escapeAttr(entry.headline);
  const tip = escapeAttr(entry.tip);

  if (cta && href) {
    return `<Tooltip headline="${headline}" tip="${tip}" cta="${cta}" href="${href}">${children}</Tooltip>`;
  }

  return `<Tooltip headline="${headline}" tip="${tip}">${children}</Tooltip>`;
}

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

let updatedCount = 0;

for (const filePath of walk(docsRoot)) {
  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('<GlossaryTerm')) {
    continue;
  }

  const expanded = content.replace(
    glossaryTermPattern,
    (_, term, ctaOverride, hrefOverride, children) =>
      buildTooltipMarkup(term, children, ctaOverride, hrefOverride)
  );

  const withoutImport = expanded
    .replace(/^import \{ GlossaryTerm \} from '\/snippets\/glossary-term\.jsx';\n\n?/m, '')
    .replace(/^import \{ GlossaryTerm \} from '\/snippets\/glossary-term\.jsx';\n/m, '');

  if (withoutImport !== content) {
    fs.writeFileSync(filePath, withoutImport);
    updatedCount += 1;
    console.log(`Expanded ${path.relative(docsRoot, filePath)}`);
  }
}

console.log(`Done. Updated ${updatedCount} files.`);
