import 'server-only';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { AGENT_DOMAIN, INSTALL_SKILLS_COMMAND, NPX_CLI } from './onboarding';

/**
 * The skill `skill install` writes, as the CLI ships it, so this page says what the agent will be taught.
 * Read from the monorepo while the page is built: the dashboard runs from `apps/human-dashboard`.
 */
export const SKILL_FILE = '../../packages/agentinbox/src/skills/content/agent-inbox/SKILL.md';

/**
 * `/agents.md`, what an agent reads to use Agent Inbox. The connect prompt links to it. It explains the
 * prompt's commands first, then the rest is the agent-inbox skill.
 */
export function agentsMarkdown(): string {
  return [
    '# Agent Inbox: instructions for agents',
    '',
    `${AGENT_DOMAIN} gives an AI agent an inbox on email, Telegram and Slack. People write to it there, and the agent reads and replies. It can also ask the person it works for (its operator) a question and wait for the answer. Everything goes through one CLI, \`${NPX_CLI}\`, which needs nothing installed first.`,
    '',
    `## Connect with the prompt from ${AGENT_DOMAIN}`,
    '',
    'Your operator gets a prompt to paste into an agent. It names the agent and has a one-time code in it. Run its commands in order:',
    '',
    `1. **Connect:** \`${NPX_CLI} connect <agent> --code <code> --yes --api-url=<api>\``,
    '   - `<agent>` is the agent’s address before the `@`, such as `atlas`.',
    '   - The code works once, for 10 minutes. A used, expired or wrong code exits 1 and says which: ask your operator for a new one rather than guessing, since the agent stops taking codes for a while after a few wrong ones.',
    '   - `--yes` replaces a setup already on this computer. The prompt has it because your operator wrote it. Without it, `connect` stops and asks.',
    '   - Keep `--api-url` as the prompt gives it: a code only works on the API that made it. From then on, every command on this computer acts as that agent.',
    `2. **Add the skill:** \`${INSTALL_SKILLS_COMMAND}\` writes the agent-inbox skill (everything after this section) into the project you are in, for Claude Code (\`.claude/skills\`), Cursor and the other agents it finds there. \`--host claude\` picks one.`,
    `3. **Check it works:** \`${NPX_CLI} inbox list\` lists the open conversations.`,
    '',
    `From now on, run \`${NPX_CLI} inbox list --filter unread\` at the start of every task. Reply in the same conversation. Ask your operator before you message anyone new.`,
    '',
    '## No terminal?',
    '',
    `Chat apps such as ChatGPT, or Claude in the browser, connect through the Agent Inbox MCP server instead. Your operator adds it on ${AGENT_DOMAIN}, in Configure, under "Connect another agent". Its tools match the CLI's commands: see "If you have the Agent Inbox MCP tools" below.`,
    '',
    '## Using the inbox',
    '',
    skillBody(readFileSync(join(process.cwd(), SKILL_FILE), 'utf8')),
  ].join('\n');
}

/** The skill without its front matter and title, which this page has its own of. */
function skillBody(skill: string): string {
  const withoutFrontMatter = skill.replace(/^---\n[\s\S]*?\n---\n/, '');

  return withoutFrontMatter
    .replace(/^\s*# .*\n/, '')
    .trim()
    .concat('\n');
}
