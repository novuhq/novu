import {
  CONNECTOR_CAPTION,
  chatPrompt,
  cliCaption,
  cliScript,
  connectorSteps,
  formatScript,
  type HostWay,
  mcpCaption,
  mcpScript,
  pluginCaption,
  pluginScript,
  promptCaption,
  promptText,
  wayLabel,
  waysOf,
} from './host-ways';
import {
  type ChatApp,
  type CommandHost,
  type Host,
  hostPath,
  listenCommand,
  MCP_SERVER_NAME,
  MCP_URL,
  skillsCommand,
  tellYourAgent,
} from './hosts';
import { AGENT_DOMAIN, INSTALL_SKILLS_COMMAND, NPX_CLI, SKILLS_CLI_AGENTS_URL, SKILLS_REPO } from './onboarding';
import { SITE_ORIGIN } from './seo';

/** The skills on GitHub, which an agent reads for what this page leaves out. */
const SKILL_FOLDER_URL = `https://github.com/${SKILLS_REPO}/blob/main/skills`;

/**
 * `/<host>.md`: a host's public page for agents. It opens with the line the operator tells their agent, then
 * the same snippets the dashboard's setup box shows (`host-ways.ts`), in the same order. A host that runs
 * commands also gets the setup an agent can do before anyone has an account. A chat app gets the sign-in
 * its operator walks through.
 */
export function hostMarkdown(host: Host): string {
  const sections = [
    `# Agent Inbox for ${host.id === 'general' ? 'any agent' : host.name}`,
    `> ${tellYourAgent()}`,
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
  const runner = host.id === 'general' ? 'the program you run in' : host.name;
  // Without a terminal, the skills CLI installs nothing unless it's told for which agent, and not to ask.
  const skillsLine = host.skillsAgent ? skillsCommand(host) : `${INSTALL_SKILLS_COMMAND} --agent <your id> -y`;

  return [
    `The steps below are the same ones the dashboard shows, in the same order. Run them in a terminal, ${where}. The CLI is \`${NPX_CLI}\`, which needs nothing installed first.`,
    ...waysOf(host).flatMap((way) => commandWay(host, way, runner)),
    '## No code yet: set yourself up',
    'Only when your operator asks you to set up Agent Inbox. When they already have an Agent Inbox account, ask them for a one-time code instead.',
    [
      '1. Ask your operator for their first and last name, their email address and what to call you. Never make them up.',
      `2. \`${NPX_CLI} setup --email <their email> --name "<their name>" --agent-name "<what they call you>"\` creates the inbox without an account: a free demo with a few messages, whose email inbox only receives until your operator claims it. A new agent needs the name. Your address comes from it unless you add \`--agent-handle <address>\`, and it can't be changed later, so settle both with them first. It emails them a confirmation link and waits up to 5 minutes for them to open it, so tell them to look out for it first, and run it in the background or with a long timeout if ${runner} stops commands sooner. If it stops first, run it again: it keeps the same inbox and sends a new link.`,
      `3. \`${NPX_CLI} login\` prints a link and a code, then waits up to an hour, so run it the same way. Give both to your operator: they sign in on ${AGENT_DOMAIN}, check that the code matches and approve. The setup then moves into their account. If it stops before they approve, run it again for a new code.`,
      `4. \`${skillsLine}\`, then \`${NPX_CLI} list\`.${host.afterCommands ? ` ${host.afterCommands}` : ''}`,
    ].join('\n'),
    `Never ask for a Telegram bot token or a Slack token: \`${NPX_CLI} channel add telegram\` (or \`slack\`) prints a link where your operator finishes in their browser. When ${runner} won't let you run a command, for example one that saves a key, tell your operator the exact command and let them run it.`,
    ...listenSections(host),
  ];
}

/** One tab of the dashboard's setup box, written out for an agent. */
function commandWay(host: CommandHost, way: HostWay, runner: string): string[] {
  switch (way) {
    case 'cli':
      return cliWay(host, runner);
    case 'plugin':
      return pluginWay(host);
    case 'mcp':
      return mcpWay(host);
    case 'connector':
    case 'prompt':
      return [];
    default: {
      const exhaustive: never = way;

      return exhaustive;
    }
  }
}

function cliWay(host: CommandHost, runner: string): string[] {
  const skillsNote = host.skillsAgent
    ? []
    : [
        `The skills line above is what a person runs, with the skills CLI there to ask which agents it found. When nobody is at the terminal, run \`${INSTALL_SKILLS_COMMAND} --agent <your id> -y\` instead. \`<your id>\` is what the skills CLI calls the program you run in, such as \`claude-code\`, \`codex\` or \`cursor\` ([the list](${SKILLS_CLI_AGENTS_URL})). Without \`--agent\` and \`-y\` it installs nothing.`,
      ];

  return [
    `## ${wayLabel(host, 'cli')}`,
    `Your operator signs in on ${AGENT_DOMAIN} and copies these from Configure, under "Connect another agent", with the agent and the code filled in. Run them when they hand them to you; when ${runner} won't let you, for example because \`connect\` saves a key, ask your operator to run them in their terminal instead.`,
    fence(formatScript(cliScript(host, { handle: '<agent>', code: '<code>' }))),
    cliCaption(host),
    '`<agent>` is the agent’s address before the `@`, such as `atlas`. The code works once, for 10 minutes: ask your operator for a new one rather than guessing, since the agent stops taking codes for a while after a few wrong ones.',
    'Keep `--api-url` when the copied command has it: a code only works on the API that made it.',
    ...skillsNote,
  ];
}

function pluginWay(host: CommandHost): string[] {
  const alternative = host.alternative;
  if (alternative?.kind !== 'plugin') {
    return [];
  }

  return [
    `## ${wayLabel(host, 'plugin')}`,
    pluginCaption(host),
    fence(formatScript(pluginScript(host))),
    ...(alternative.agentNotes ?? []),
  ];
}

function mcpWay(host: CommandHost): string[] {
  const alternative = host.alternative;
  if (alternative?.kind !== 'mcp-config') {
    return [];
  }

  return [
    `## ${wayLabel(host, 'mcp')}`,
    mcpCaption(host),
    ...(alternative.installLink ? [`${alternative.installLink.label}: ${alternative.installLink.href(MCP_URL)}`] : []),
    fence(formatScript(mcpScript(host, MCP_URL))),
    ...(alternative.agentNotes ?? []),
  ];
}

function fence(text: string): string {
  return ['```text', text, '```'].join('\n');
}

/** The optional last step, for a host `listen` can start: listening for messages on the computer. */
function listenSections(host: CommandHost): string[] {
  const command = listenCommand(host);
  if (!command) {
    return [];
  }

  return [
    '## Optional: listen for messages',
    `When your operator wants a message to reach you while nobody runs ${host.name}, run \`${command}\` in the project folder. They get an Allow/Deny message, and nothing starts until they allow it. From then on a message from them, or from a contact the agent listens to, starts ${host.name} there, in the background and after restarts, and anything your settings don't allow asks them first. \`${NPX_CLI} listen status\` shows where you are listening; \`${NPX_CLI} listen stop\` ends it.`,
  ];
}

function chatAppSections(host: ChatApp): string[] {
  const server = `the Agent Inbox MCP server, \`${MCP_URL}\` (named \`${MCP_SERVER_NAME}\`)`;

  return [
    host.addsServerWhenAsked
      ? `${host.name} connects by signing in to ${server}. You add it yourself when asked, which is the prompt below, then your operator authorizes it and signs in.`
      : `${host.name} connects by signing in to ${server}. You can't add it yourself: walk your operator through the same steps the dashboard shows, in ${host.name}.`,
    ...waysOf(host).flatMap((way) => chatWay(host, way)),
    ...(host.settings ? [`Where to start: ${host.settings.url}`] : []),
    '## Once it’s connected',
    `Your tools are \`inbox_list\`, \`inbox_send\` and the rest. When the account has no agent yet, they say so: call \`inbox_setup\` to create it, after asking your operator what to call the agent, which address it gets and which email to confirm. See [the agentinbox-mcp skill](${SKILL_FOLDER_URL}/agentinbox-mcp/SKILL.md).`,
    'To add Telegram or Slack, call `channel_add` when your operator asks, and show them the link it returns in your chat, never through `inbox_send` or `inbox_reply`. Never ask for a bot token or a Slack token.',
  ];
}

/** One tab of a chat app's setup box. */
function chatWay(host: ChatApp, way: HostWay): string[] {
  switch (way) {
    case 'connector':
      return [
        `## ${wayLabel(host, way)}`,
        CONNECTOR_CAPTION,
        connectorSteps(host, MCP_URL)
          .map((step, index) => {
            const paste = step.paste ? `\n   \`${step.paste}\`` : '';

            return `${index + 1}. ${step.text}${paste}`;
          })
          .join('\n'),
      ];
    case 'prompt':
      return [
        `## ${wayLabel(host, way)}`,
        promptCaption(host),
        fence(promptText(chatPrompt(host, { handle: '<agent>', mcpUrl: MCP_URL }))),
        '`<agent>` is the agent’s address before the `@`. The dashboard fills it in once your operator is signed in.',
      ];
    case 'cli':
    case 'plugin':
    case 'mcp':
      return [];
    default: {
      const exhaustive: never = way;

      return exhaustive;
    }
  }
}
