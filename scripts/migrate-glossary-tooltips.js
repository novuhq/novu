#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const docsRoot = path.join(__dirname, '..', 'docs');
const importLine = "import { GlossaryTerm } from '/snippets/glossary-term.jsx';\n";

const tooltipReplacements = [
  [
    /<Tooltip tip="The application identifier is a unique identifier for your application\. You can find it in the Novu Dashboard under the API keys page\.">applicationIdentifier<\/Tooltip>/g,
    '<GlossaryTerm term="application-identifier">applicationIdentifier</GlossaryTerm>',
  ],
  [
    /<Tooltip tip="The application identifier is a unique identifier for your application\.">applicationIdentifier<\/Tooltip>/g,
    '<GlossaryTerm term="application-identifier">applicationIdentifier</GlossaryTerm>',
  ],
  [
    /<Tooltip tip="The subscriber ID is the unique identifier for the user in your application, typically the user's id in your database\.">subscriberId<\/Tooltip>/g,
    '<GlossaryTerm term="subscriber-id">subscriberId</GlossaryTerm>',
  ],
  [
    /<Tooltip tip="The subscriber ID is the unique identifier for the user in your application, typically the user's ID in your database\.">subscriberId<\/Tooltip>/g,
    '<GlossaryTerm term="subscriber-id">subscriberId</GlossaryTerm>',
  ],
];

const triggerSectionReplacement = [
  "In this step, you'll create a simple workflow to send your first notification via the Inbox component. Follow these steps to set up and trigger a workflow from your Novu dashboard.",
  "In this step, you'll create a simple <GlossaryTerm term=\"workflow\">workflow</GlossaryTerm> to send your first notification via the <GlossaryTerm term=\"inbox\">Inbox</GlossaryTerm> component. Follow these steps to set up and <GlossaryTerm term=\"trigger\">trigger</GlossaryTerm> a workflow from your Novu dashboard.",
];

function ensureImport(content) {
  if (content.includes("from '/snippets/glossary-term.jsx'")) {
    return content;
  }

  const match = content.match(/^---\n[\s\S]*?\n---\n/);

  if (!match) {
    return importLine + content;
  }

  return content.replace(match[0], `${match[0]}${importLine}`);
}

function updateFile(filePath, extraReplacements = []) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const [pattern, replacement] of tooltipReplacements) {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      changed = true;
    }
  }

  if (content.includes(triggerSectionReplacement[0])) {
    content = content.replace(triggerSectionReplacement[0], triggerSectionReplacement[1]);
    changed = true;
  }

  for (const [from, to] of extraReplacements) {
    if (content.includes(from)) {
      content = content.replace(from, to);
      changed = true;
    }
  }

  if (changed || !content.includes("from '/snippets/glossary-term.jsx'")) {
    content = ensureImport(content);
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
  }
}

const quickstarts = [
  'platform/quickstart/nextjs.mdx',
  'platform/quickstart/react.mdx',
  'platform/quickstart/remix.mdx',
  'platform/quickstart/angular.mdx',
  'platform/quickstart/vue.mdx',
  'platform/quickstart/nuxt.mdx',
  'platform/quickstart/vanilla-js.mdx',
];

for (const relativePath of quickstarts) {
  updateFile(path.join(docsRoot, relativePath));
}
