import 'server-only';

import { AGENT_DOMAIN, INSTALL_SKILLS_COMMAND, NPX_CLI, SKILLS_REPO } from './onboarding';

/** The skill this page ends with: agentinbox, as `npx skills add` installs it from its own repository. */
const SKILL_URL = `https://raw.githubusercontent.com/${SKILLS_REPO}/main/skills/agentinbox/SKILL.md`;

/** The skill's folder on GitHub. Its relative links, such as `references/cli.md`, lead there from this page. */
const SKILL_FOLDER_URL = `https://github.com/${SKILLS_REPO}/blob/main/skills/agentinbox/`;

/** How long the build waits for GitHub before the page links to the skill instead. */
const SKILL_FETCH_TIMEOUT_MS = 10_000;

/**
 * `/agents.md`, what an agent reads to use Agent Inbox. The home page links to it. It explains the connect
 * commands first, then the rest is the agentinbox skill.
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
    `Your operator gets three commands on ${AGENT_DOMAIN} that name the agent and carry a one-time code, and runs them in their terminal, in the project you work in:`,
    '',
    `1. **Connect:** \`${NPX_CLI} connect <agent> --code <code> --yes --api-url=<api>\``,
    '   - `<agent>` is the agent’s address before the `@`, such as `atlas`.',
    '   - The code works once, for 10 minutes. A used, expired or wrong code exits 1 and says which: ask your operator for a new one rather than guessing, since the agent stops taking codes for a while after a few wrong ones.',
    '   - `--yes` replaces a setup already on this computer. The commands have it so they can be pasted together. Without it, `connect` stops and asks.',
    '   - Keep `--api-url` as the commands give it: a code only works on the API that made it. From then on, every command on this computer acts as that agent.',
    `2. **Add the skills:** \`${INSTALL_SKILLS_COMMAND}\` installs the Agent Inbox skills into the project you are in, for Claude Code, Cursor, Codex and the other agents it finds there: agentinbox (everything after this section), agentinbox-cli and agentinbox-mcp. \`--agent claude-code\` picks one agent.`,
    `3. **Check it works:** \`${NPX_CLI} inbox list\` lists the open conversations.`,
    '',
    `From now on, run \`${NPX_CLI} inbox list --filter unread\` at the start of every task. Reply in the same conversation. Ask your operator before you message anyone new.`,
    '',
    '## No terminal?',
    '',
    `Chat apps such as ChatGPT, or Claude in the browser, connect through the Agent Inbox MCP server instead. Your operator adds it on ${AGENT_DOMAIN}, in Configure, under "Connect another agent". Its tools match the CLI's commands: see [the MCP tools](${SKILL_FOLDER_URL}references/mcp-tools.md).`,
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
