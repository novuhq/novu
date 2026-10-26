import {
  HOME_AUTH,
  HOME_CONTACTS,
  HOME_CONTACTS_DESCRIPTION,
  HOME_FLAGS,
  HOME_HOSTS_DESCRIPTION,
  HOME_HOW_IT_WORKS,
  HOME_INTRODUCTION,
  HOME_INVITES,
  HOME_NOTES,
  HOME_QUICKSTART,
  HOME_READY,
  HOME_TRUST,
  HOME_USES,
  type HomeCommand,
  INSTALL_OPTIONS,
} from '@/data/home';

import { ARD_HREF } from './ard-catalog';
import { HOSTS, type Host, hostMarkdownPath } from './hosts';
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
    '> The email, Slack, and Telegram inbox for AI agents.',
    HOME_INTRODUCTION.join('\n'),
    [
      `Canonical documentation: ${SITE_ORIGIN}/`,
      `Human-readable product page: ${SITE_ORIGIN}/sapien`,
      `Connected from ${SITE_ORIGIN.replace(/^https:\/\/www\./, '')} with a one-time code: ${SITE_ORIGIN}/agents.md`,
    ].join('\n'),
    '## Quickstart',
    ...INSTALL_OPTIONS.flatMap((option) => [`### ${option.label}`, commandBlock(option.commands)]),
    commandBlock(HOME_QUICKSTART),
    `## Hosts (${HOME_NOTES.hosts})`,
    HOME_HOSTS_DESCRIPTION,
    hostList(),
    '## How it works',
    ...explanations.map((line) => `- ${line.trim()}`),
    '## When',
    HOME_USES.map((item) => `- **${item.title}.** ${item.text}`).join('\n'),
    '## Security',
    HOME_READY.map((item) => `- **${item.title}.** ${item.text}`).join('\n'),
    '## Flags',
    HOME_FLAGS.map(
      (item) =>
        `- \`${item.flag}${'argument' in item ? ` ${item.argument}` : ''}\` — ${item.description
          .join(' ')
          .replace(/^#\s*|\n#\s*|\s#\s*/g, ' ')
          .trim()}`
    ).join('\n'),
    `## Contacts (${HOME_NOTES.contacts})`,
    HOME_CONTACTS_DESCRIPTION,
    commandBlock(HOME_CONTACTS),
    '### Invite',
    commandBlock(HOME_INVITES),
    '## Authentication',
    `\`${firstCommand}\`, \`${secondCommand}\` and \`${thirdCommand}\` store credentials in \`${HOME_AUTH.file}\`. ${HOME_AUTH.alternative}`,
    '## Sources',
    `- [CLI source and official README](${SOURCE_URL})\n- [npm package](${PACKAGE_URL})\n- [Built by Novu](https://novu.co/)`,
    HOME_TRUST,
  ];

  return `${sections.join('\n\n')}\n`;
}

/** `/llms.txt`: what this site has for language models, and where. */
export function llmsIndex() {
  return `# Agent Inbox

> The email, Slack, and Telegram inbox for AI agents. The @agentinbox/cli CLI gives an agent an inbox on email, Slack, and Telegram: it reads what people wrote, asks questions, requests approvals, offers choices, and sends updates to a human.

The website's command examples are available as clean Markdown. Consult the official package README for the latest CLI behavior. Run setup and login when your human asks you to; they approve the login on agentinbox.md.

## Documentation

- [Agent Inbox CLI documentation](${SITE_ORIGIN}/index.md): Installation, setup, commands, when to use it, security, flags, contacts, and authentication.
- [Instructions for agents](${SITE_ORIGIN}/agents.md): Connecting with a one-time code from agentinbox.md, or setting yourself up without one, then how to use the inbox.
- [Official CLI README](https://raw.githubusercontent.com/novuhq/novu/next/packages/agentinbox/README.md): Current package documentation maintained with the CLI source.
- [Agentic resources](${ARD_HREF}): The MCP server and the Agent Skills index, for a client discovering what this domain offers.

## Hosts

${hostList({ described: true })}

## Optional

- [Human-readable product page](${SITE_ORIGIN}/sapien): Product overview and interactive workflow examples.
- [npm package](${PACKAGE_URL}): Published @agentinbox/cli package.
- [Source repository](${SOURCE_URL}): CLI source maintained by Novu.
`;
}

/** Each host's page for agents (`/claude-code.md`), one to a line; for `/llms.txt`, with what each one covers. */
function hostList({ described = false }: { described?: boolean } = {}): string {
  return HOSTS.map((host) => {
    const link = `- [Agent Inbox for ${host.id === 'general' ? 'any agent' : host.name}](${SITE_ORIGIN}${hostMarkdownPath(host.id)})`;

    return described ? `${link}: ${hostCovers(host)}` : link;
  }).join('\n');
}

/** What a host's page covers, in a line. */
function hostCovers(host: Host): string {
  if (host.group === 'chat') {
    return `Adding the Agent Inbox MCP server to ${host.name} and signing in.`;
  }

  const { alternative } = host;
  if (!alternative) {
    return 'Connecting with a one-time code, or an agent setting itself up.';
  }

  const second = alternative.kind === 'plugin' ? `the ${host.name} plugin` : `the MCP server in ${alternative.file}`;

  return `Connecting with a one-time code, an agent setting itself up, or ${second}.`;
}
