import { connectCommands } from './connect-prompt';
import { type ChatApp, type CommandHost, type Host, hostPath, MCP_SERVER_NAME, MCP_URL, tellYourAgent } from './hosts';
import { AGENT_DOMAIN, INSTALL_SKILLS_COMMAND, NPX_CLI, SKILLS_CLI_AGENTS_URL, SKILLS_REPO } from './onboarding';
import { SITE_ORIGIN } from './seo';

/** The skills on GitHub, which an agent reads for what this page leaves out. */
const SKILL_FOLDER_URL = `https://github.com/${SKILLS_REPO}/blob/main/skills`;

/**
 * `/<host>.md`: a host's public page for agents. It opens with the line the operator tells their agent, then
 * the same steps the page and the dashboard show, from the same list (`hosts.ts`): for a host that runs
 * commands, connecting with a code, setting itself up without one, and the second way in; for a chat app,
 * the sign-in the agent walks its operator through.
 */
export function hostMarkdown(host: Host): string {
  const sections = [
    `# Agent Inbox for ${host.id === 'general' ? 'any agent' : host.name}`,
    `> ${tellYourAgent(host.id)}`,
    `${AGENT_DOMAIN} gives an AI agent an inbox on Telegram, Slack and email. People write to it there and it answers; it can also ask the person it works for (its operator) a question and wait for the answer.`,
    `Human-readable page: ${SITE_ORIGIN}${hostPath(host.id)}`,
    ...(host.group === 'commands' ? commandSections(host) : chatAppSections(host)),
    '## More',
    [
      `- [Using the inbox, for agents](${SITE_ORIGIN}/agents.md)`,
      `- [Every host Agent Inbox has steps for](${SITE_ORIGIN}/llms.txt)`,
      ...(host.docsUrl ? [`- [${host.name}'s own docs for these steps](${host.docsUrl})`] : []),
    ].join('\n'),
  ];

  return `${sections.join('\n\n')}\n`;
}

function commandSections(host: CommandHost): string[] {
  const where = host.runsIn === 'computer' ? 'on the computer you run on' : 'in the project you work in';
  const [connect, skills, check] = connectCommands({ handle: '<agent>', code: '<code>' }, host);
  const runner = host.id === 'general' ? 'the program you run in' : host.name;
  // Without a terminal, the skills CLI installs nothing unless it's told for which agent, and not to ask.
  const skillsLine = host.skillsAgent ? skills.command : `${INSTALL_SKILLS_COMMAND} --agent <your id> -y`;
  const skillsNote = host.skillsAgent
    ? []
    : [
        `   - \`<your id>\` is what the skills CLI calls the program you run in, such as \`claude-code\`, \`codex\` or \`cursor\` ([the list](${SKILLS_CLI_AGENTS_URL})). Without \`--agent\` and \`-y\` it installs nothing when nobody is at the terminal.`,
      ];
  const after = host.afterCommands ? [`   - ${host.afterCommands}`] : [];

  return [
    `Everything below runs through the CLI, \`${NPX_CLI}\`, which needs nothing installed first. Run the commands in a terminal, ${where}.`,
    '## If your operator gave you a one-time code',
    `Your operator signs in on ${AGENT_DOMAIN} and copies these from Configure, under "Connect another agent", with the agent and the code filled in. Run them when they hand them to you; when ${runner} won't let you, for example because \`connect\` saves a key, ask your operator to run them in their terminal instead.`,
    [
      `1. **${connect.label}:** \`${connect.command}\``,
      '   - `<agent>` is the agent’s address before the `@`, such as `atlas`. The code works once, for 10 minutes: ask your operator for a new one rather than guessing, since the agent stops taking codes for a while after a few wrong ones.',
      '   - Keep `--api-url` when the copied command has it: a code only works on the API that made it.',
      `2. **${skills.label}:** \`${skillsLine}\``,
      ...skillsNote,
      ...after,
      `3. **${check.label}:** \`${check.command}\``,
    ].join('\n'),
    '## No code yet: set yourself up',
    'Only when your operator asks you to set up Agent Inbox. When they already have an Agent Inbox account, ask them for a one-time code instead.',
    [
      '1. Ask your operator for their first and last name and their email address. Never make them up.',
      `2. \`${NPX_CLI} setup --email <their email> --name "<their name>"\` creates the inbox without an account: a free demo with a few messages, whose email inbox only receives until your operator claims it. Add \`--agent-name "<name>"\` when they told you what to call you.`,
      `3. \`${NPX_CLI} login\` prints a link and a code. Give both to your operator: they sign in on ${AGENT_DOMAIN}, check that the code matches and approve. The setup then moves into their account.`,
      `4. \`${skillsLine}\`, then \`${check.command}\`.${host.afterCommands ? ` ${host.afterCommands}` : ''}`,
    ].join('\n'),
    `Never ask for a Telegram bot token or a Slack token: \`${NPX_CLI} channel add telegram\` (or \`slack\`) prints a link where your operator finishes in their browser. When ${runner} won't let you run a command, for example one that saves a key, tell your operator the exact command and let them run it.`,
    ...(host.alternative ? alternativeSections(host) : []),
  ];
}

function alternativeSections(host: CommandHost): string[] {
  const alternative = host.alternative;
  if (!alternative) {
    return [];
  }

  const heading = `## ${alternative.title.replace(/^Or /, 'Or: ')}`;
  const signIn = alternative.signInCommand
    ? `${alternative.signIn} \`${alternative.signInCommand}\``
    : alternative.signIn;
  const notes = alternative.agentNotes ?? [];
  if (alternative.kind === 'plugin') {
    return [
      heading,
      `${alternative.text} ${alternative.typedIn === 'host' ? `Type these in ${host.name}:` : 'Run these in a terminal:'}`,
      ['```text', ...alternative.lines, '```'].join('\n'),
      signIn,
      ...notes,
    ];
  }

  return [
    heading,
    alternative.text,
    ...(alternative.installLink ? [`${alternative.installLink.label}: ${alternative.installLink.href(MCP_URL)}`] : []),
    ['```json', alternative.config(MCP_URL), '```'].join('\n'),
    signIn,
    ...notes,
  ];
}

function chatAppSections(host: ChatApp): string[] {
  const steps = host.steps
    .map((step, index) => {
      const copy = step.copy ? ` \`${step.copy.value(MCP_URL)}\`` : '';

      return `${index + 1}. **${step.title}:** ${step.text}${copy}`;
    })
    .join('\n');
  const server = `the Agent Inbox MCP server, \`${MCP_URL}\` (named \`${MCP_SERVER_NAME}\`)`;

  return [
    host.addsServerWhenAsked
      ? `${host.name} connects by signing in to ${server}. You can add it yourself: add a custom MCP server named \`${MCP_SERVER_NAME}\` with that URL, then ask your operator to authorize it and sign in. These are the steps they see:`
      : `${host.name} connects by signing in to ${server}. You can't add it yourself: walk your operator through these steps, in ${host.name}.`,
    steps,
    ...(host.settings ? [`Where to start: ${host.settings.url}`] : []),
    '## Once it’s connected',
    `Your tools are \`inbox_list\`, \`inbox_send\` and the rest. When the account has no agent yet, they say so: call \`inbox_setup\` to create it, after asking your operator what to call the agent, which address it gets and which email to confirm. See [the agentinbox-mcp skill](${SKILL_FOLDER_URL}/agentinbox-mcp/SKILL.md).`,
    `Telegram and Slack are set up on ${AGENT_DOMAIN}. Never ask for a bot token or a Slack token.`,
  ];
}
