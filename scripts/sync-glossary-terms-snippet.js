#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const glossaryTerms = require('./glossary-terms-data');
const outputPath = path.join(__dirname, '..', 'docs', 'snippets', 'glossary-terms.mdx');

const mdxContent = `/**
 * Glossary term definitions for documentation tooltips.
 * Source of truth: scripts/glossary-terms-data.js
 * Run \`node scripts/sync-glossary-terms-snippet.js\` after editing definitions.
 *
 * Use native Mintlify <Tooltip> directly in MDX pages. Do not wrap Tooltip inside
 * custom React snippet components — Mintlify does not compile MDX components there.
 */
export const glossaryTerms = ${JSON.stringify(glossaryTerms, null, 2)};
`;

fs.writeFileSync(outputPath, mdxContent);
console.log(`Synced ${outputPath}`);
