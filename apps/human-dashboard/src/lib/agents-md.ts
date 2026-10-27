import 'server-only';

import { HOSTS, hostMarkdownPath, hostPath } from './hosts';
import { AGENT_DOMAIN, INSTALL_SKILLS_COMMAND, NPX_CLI, SKILLS_CLI_AGENTS_URL, SKILLS_REPO } from './onboarding';
import { SITE_ORIGIN } from './seo';

/** The skill this page ends with: agentinbox, as `npx skills add` installs it from its own repository. */
const SKILL_URL = `https://raw.githubusercontent.com/${SKILLS_REPO}/main/skills/agentinbox/SKILL.md`;

/** The skill's folder on GitHub. Its relative links, such as `references/cli.md`, lead there from this page. */
const SKILL_FOLDER_URL = `https://github.com/${SKILLS_REPO}/blob/main/skills/agentinbox/`;

/** How long the build waits for GitHub before the page links to the skill instead. */
const SKILL_FETCH_TIMEOUT_MS = 10_000;

/**
 * `/agents.md`, what an agent reads to use Agent Inbox. The home page links to it. It explains the connect
 * commands first, then how an agent sets itself up without a code and where each host's steps are; the rest
 * is the agentinbox skill.
 */
export async function agentsMarkdown(): Promise<string> {
  const skill = await fetchSkill();

  return [
    '# Agent Inbox: instructions for agents',
    '',
    `${AGENT_DOMAIN} gives an AI agent an inbox on email, Telegram and Slack. People write to it there, and the agent reads and replies. It can also ask the person it works for (its operator) a question and wait for the answer. Everything goes through one CLI, \`${NPX_CLI}\`, which needs nothing installed first.`,
    '',
    `## Connect with the commands from ${AGENT_DOMAIN}`,
    '',
    `Your operator gets three commands on ${AGENT_DOMAIN} that name the agent and carry a one-time code. Run them when they hand them to you, in the project you work in; when your host won't let you, for example because \`connect\` saves a key, ask your operator to run them in their terminal instead:`,
    '',
    `1. **Connect:** \`${NPX_CLI} connect <agent> --code <code> --yes --api-url=<api>\``,
    '   - `<agent>` is the agent’s address before the `@`, such as `atlas`.',
    '   - The code works once, for 10 minutes. A used, expired or wrong code exits 1 and says which: ask your operator for a new one rather than guessing, since the agent stops taking codes for a while after a few wrong ones.',
    '   - `--yes` replaces a setup already on this computer. The commands have it so they can be pasted together. Without it, `connect` stops and asks.',
    '   - Keep `--api-url` as the commands give it: a code only works on the API that made it. From then on, every command on this computer acts as that agent.',
    `2. **Add the skills:** \`${INSTALL_SKILLS_COMMAND} --agent <your id> -y\` installs the Agent Inbox skills into the project you are in: agentinbox (everything after this section), agentinbox-cli and agentinbox-mcp.`,
    `   - \`<your id>\` is what the skills CLI calls the program you run in: \`claude-code\`, \`codex\`, \`cursor\`, \`opencode\`, \`hermes-agent\` or \`openclaw\` ([the list](${SKILLS_CLI_AGENTS_URL})). Hermes and OpenClaw add \`-g\`, for every session on the computer.`,
    '   - Without `--agent` and `-y` it installs nothing when nobody is at the terminal: add them when the command you were given lacks them.',
    `3. **Check it works:** \`${NPX_CLI} inbox list\` lists the open conversations.`,
    '',
    `From now on, run \`${NPX_CLI} inbox list --filter unread\` at the start of every task. Reply in the same conversation. Ask your operator before you message anyone new.`,
    '',
    '## No code? Set yourself up',
    '',
    'When your operator asks you to set up Agent Inbox and gave you no code:',
    '',
    '1. Ask them for their first and last name and their email address. Never make them up.',
    `2. \`${NPX_CLI} setup --email <their email> --name "<their name>"\` creates the inbox without an account: a free demo with a few messages, whose email inbox only receives until your operator claims it. Add \`--agent-name "<name>"\` when they told you what to call you.`,
    `3. \`${NPX_CLI} login\` prints a link and a code. Give both to your operator: they sign in on ${AGENT_DOMAIN}, check that the code matches and approve. The setup then moves into their account.`,
    '4. Add the skills and check that it works, as above.',
    '',
    `Never ask for a Telegram bot token or a Slack token: \`${NPX_CLI} channel add telegram\` (or \`slack\`) prints a link where your operator finishes in their browser. When your host won't let you run a command, for example one that saves a key, tell your operator the exact command and let them run it.`,
    '',
    '## Steps for your host',
    '',
    'Each host has its own page of steps, with its plugin or sign-in:',
    '',
    ...HOSTS.map(
      (host) =>
        `- [${host.id === 'general' ? 'Any agent' : host.name}](${SITE_ORIGIN}${hostMarkdownPath(host.id)}): ${AGENT_DOMAIN}${hostPath(host.id)}`
    ),
    '',
    '## No terminal?',
    '',
    `Chat apps such as ChatGPT, Claude in the browser and Grok Bot connect through the Agent Inbox MCP server instead: your operator adds it in the app and signs in, as their pages above show. Its tools match the CLI's commands: see [the MCP tools](${SKILL_FOLDER_URL}references/mcp-tools.md).`,
    '',
    '## Using the inbox',
    '',
    skill ? skillBody(skill) : `Read the agentinbox skill on GitHub: ${SKILL_FOLDER_URL}SKILL.md\n`,
  ].join('\n');
}

/** The skill from GitHub, or `null` when GitHub can't be reached, so the page still builds. */
async function fetchSkill(): Promise<string | null> {
  try {
    const response = await fetch(SKILL_URL, { signal: AbortSignal.timeout(SKILL_FETCH_TIMEOUT_MS) });

    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}

/** The skill without its front matter and title, which this page has its own of, and with links that work here. */
function skillBody(skill: string): string {
  const withoutFrontMatter = skill.replace(/^---\n[\s\S]*?\n---\n/, '');

  return withoutFrontMatter
    .replace(/^\s*# .*\n/, '')
    .replace(/\]\((?!https?:|#)([^)\s]+)\)/g, (_link, path: string) => `](${SKILL_FOLDER_URL}${path})`)
    .trim()
    .concat('\n');
}
