#!/usr/bin/env node

const { execSync } = require('child_process');

const diff = execSync('git diff next...HEAD -- docs/', { encoding: 'utf8' });

const removedLinks = [];
const addedTooltips = [];
let currentFile = null;

function extractMarkdownLinks(content) {
  const results = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = re.exec(content)) !== null) {
    results.push({ text: match[1], url: match[2] });
  }

  return results;
}

function extractTooltips(content) {
  const results = [];
  const re = /<Tooltip[^>]*href="([^"]+)"[^>]*>([^<]+)<\/Tooltip>/g;
  let match;

  while ((match = re.exec(content)) !== null) {
    results.push({ text: match[2], url: match[1] });
  }

  return results;
}

function normalizeText(value) {
  return value.toLowerCase().replace(/[<>`]/g, '').trim();
}

function textsOverlap(left, right) {
  const leftText = normalizeText(left);
  const rightText = normalizeText(right);

  if (leftText.includes(rightText) || rightText.includes(leftText)) {
    return true;
  }

  const leftWords = leftText.split(/\s+/).filter((word) => word.length > 3);
  const rightWords = rightText.split(/\s+/).filter((word) => word.length > 3);

  return leftWords.some((word) => rightWords.includes(word));
}

for (const line of diff.split('\n')) {
  if (line.startsWith('diff --git')) {
    const match = line.match(/b\/(docs\/[^\s]+)/);
    currentFile = match ? match[1] : null;
    continue;
  }

  if (!currentFile) {
    continue;
  }

  if (line.startsWith('-') && !line.startsWith('---')) {
    const content = line.slice(1).trim();

    for (const link of extractMarkdownLinks(content)) {
      removedLinks.push({ file: currentFile, ...link, line: content.slice(0, 140) });
    }
  }

  if (line.startsWith('+') && !line.startsWith('+++')) {
    const content = line.slice(1).trim();

    for (const tooltip of extractTooltips(content)) {
      addedTooltips.push({ file: currentFile, ...tooltip, line: content.slice(0, 140) });
    }
  }
}

const byFile = {};

for (const removed of removedLinks) {
  byFile[removed.file] = byFile[removed.file] || { removed: [], added: [] };
  byFile[removed.file].removed.push(removed);
}

for (const added of addedTooltips) {
  byFile[added.file] = byFile[added.file] || { removed: [], added: [] };
  byFile[added.file].added.push(added);
}

console.log('=== LINK REPLACEMENTS (markdown link removed, tooltip added in same file) ===\n');

let replacementCount = 0;
const replacementsByFile = [];

for (const [file, data] of Object.entries(byFile).sort()) {
  const replacements = [];

  for (const removed of data.removed) {
    const match = data.added.find(
      (added) => textsOverlap(removed.text, added.text) || removed.url === added.url
    );

    if (match) {
      replacements.push({
        removed,
        added: match,
        urlChanged: removed.url !== match.url,
      });
    }
  }

  if (replacements.length > 0) {
    replacementCount += replacements.length;
    replacementsByFile.push({ file, replacements });
  }
}

for (const { file, replacements } of replacementsByFile) {
  console.log(`${file}:`);

  for (const replacement of replacements) {
    const urlFlag = replacement.urlChanged ? ' [URL CHANGED]' : '';
    console.log(
      `  - [${replacement.removed.text}](${replacement.removed.url}) -> Tooltip "${replacement.added.text}" CTA ${replacement.added.url}${urlFlag}`
    );
  }

  console.log('');
}

console.log(`Total likely replacements: ${replacementCount}`);

console.log('\n=== REMOVED LINKS WITHOUT MATCHING TOOLTIP ===\n');

let unmatchedCount = 0;

for (const [file, data] of Object.entries(byFile).sort()) {
  const unmatched = data.removed.filter(
    (removed) =>
      !data.added.some(
        (added) => textsOverlap(removed.text, added.text) || removed.url === added.url
      )
  );

  if (unmatched.length > 0) {
    unmatchedCount += unmatched.length;
    console.log(`${file}:`);

    for (const item of unmatched) {
      console.log(`  - [${item.text}](${item.url})`);
    }

    console.log('');
  }
}

console.log(`Total unmatched removed links: ${unmatchedCount}`);

console.log('\n=== SOLE-DESTINATION RISK (tooltip is only reference to URL on page) ===\n');

for (const { file, replacements } of replacementsByFile) {
  const filePath = file.replace(/^docs\//, 'docs/');
  const fullPath = require('path').join(__dirname, '..', filePath);
  const content = require('fs').readFileSync(fullPath, 'utf8');

  for (const replacement of replacements) {
    const url = replacement.added.url;
    const markdownLinkCount = (content.match(new RegExp(`\\]\\(${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g')) || []).length;
    const tooltipHrefCount = (content.match(new RegExp(`href="${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g')) || []).length;

    if (markdownLinkCount === 0 && tooltipHrefCount <= 1) {
      console.log(`${file}: only tooltip points to ${url} ("${replacement.added.text}")`);
    }
  }
}
