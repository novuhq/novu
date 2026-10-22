import {
  HOME_AUTH,
  HOME_CONTACTS,
  HOME_CONTACTS_DESCRIPTION,
  HOME_EXIT_CODES,
  HOME_FLAGS,
  HOME_HOW_IT_WORKS,
  HOME_INTRODUCTION,
  HOME_INVITE_DESCRIPTION,
  HOME_INVITES,
  HOME_SETUP,
  HOME_USAGE,
  type HomeCommand,
  INSTALL_COMMAND,
} from '@/data/home';

import { PACKAGE_URL, SITE_ORIGIN, SOURCE_URL } from './seo';

function commandBlock(commands: readonly HomeCommand[]) {
  return [
    '```sh',
    ...commands.map(
      (command) => command.parts.map((part) => part.text).join('') + (command.note ? `  ${command.note}` : '')
    ),
    '```',
  ].join('\n');
}

/** `/index.md`: the robots page (`/`) as Markdown, from the same commands and explanations. */
export function homeMarkdown() {
  const explanations = HOME_HOW_IT_WORKS.map((parts) =>
    parts
      .map((part) => {
        if (typeof part === 'string') return part;
        // Sentence punctuation belongs outside the code span in machine-readable text.
        const punctuation = /[.,]$/.exec(part.code)?.[0] ?? '';
        return `\`${part.code.slice(0, part.code.length - punctuation.length)}\`${punctuation}`;
      })
      .join('')
  );
  const [firstCommand, secondCommand, thirdCommand] = HOME_AUTH.commands;
  const sections = [
    '# Agent Inbox CLI',
    '> The inbox API for agents.',
    HOME_INTRODUCTION.join('\n'),
    [
      `Canonical documentation: ${SITE_ORIGIN}/`,
      `Human-readable product page: ${SITE_ORIGIN}/sapien`,
      `Connected from ${SITE_ORIGIN.replace(/^https:\/\/www\./, '')} with a one-time code: ${SITE_ORIGIN}/agents.md`,
    ].join('\n'),
    '## Install',
    commandBlock([INSTALL_COMMAND]),
    '## Setup (once, by the human)',
    commandBlock(HOME_SETUP),
    '## Usage (by an agent after setup)',
    commandBlock(HOME_USAGE),
    '## How it works',
    ...explanations,
    '## Exit codes',
    [
      '| Code | Meaning |',
      '| --- | --- |',
      ...HOME_EXIT_CODES.map(
        (item) => `| ${item.code} | ${item.description}${'resume' in item ? ` \`${item.resume}\`` : ''} |`
      ),
    ].join('\n'),
    '## Flags',
    HOME_FLAGS.map(
      (item) =>
        `- \`${item.flag}${'argument' in item ? ` ${item.argument}` : ''}\` — ${item.description
          .join(' ')
          .replace(/^#\s*|\n#\s*|\s#\s*/g, ' ')
          .trim()}`
    ).join('\n'),
    '## Invite another human',
    HOME_INVITE_DESCRIPTION,
    commandBlock(HOME_INVITES),
    '## Contacts',
    HOME_CONTACTS_DESCRIPTION,
    commandBlock(HOME_CONTACTS),
    '## Authentication',
    `\`${firstCommand}\`, \`${secondCommand}\` and \`${thirdCommand}\` store credentials in \`${HOME_AUTH.file}\`. ${HOME_AUTH.alternative}`,
    '## Sources',
    `- [CLI source and official README](${SOURCE_URL})\n- [npm package](${PACKAGE_URL})\n- [Built by Novu](https://novu.co/)`,
  ];

  return `${sections.join('\n\n')}\n`;
}

/** `/llms.txt`: what this site has for language models, and where. */
export function llmsIndex() {
  return `# Agent Inbox

> The inbox API for agents. The @agentinbox/cli CLI gives an agent an inbox on Telegram, Slack and email: it reads what people wrote, asks questions, requests approvals, offers choices and sends updates to a human.

The website's command examples and exit-code contract are available as clean Markdown. Consult the official package README for the latest CLI behavior.

## Documentation

- [Agent Inbox CLI documentation](${SITE_ORIGIN}/index.md): Installation, setup, commands, exit codes, flags, invitations, contacts, and authentication.
- [Instructions for a connected agent](${SITE_ORIGIN}/agents.md): Connecting with a one-time code from agentinbox.md, then how to use the inbox.
- [Official CLI README](https://raw.githubusercontent.com/novuhq/novu/next/packages/agentinbox/README.md): Current package documentation maintained with the CLI source.

## Optional

- [Human-readable product page](${SITE_ORIGIN}/sapien): Product overview and interactive workflow examples.
- [npm package](${PACKAGE_URL}): Published @agentinbox/cli package.
- [Source repository](${SOURCE_URL}): CLI source maintained by Novu.
`;
}
