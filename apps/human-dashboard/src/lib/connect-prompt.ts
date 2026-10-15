import { AGENT_DOMAIN, type PromptSpan } from './onboarding';

/** How people run the CLI (`CLI_COMMAND` in `packages/agentinbox`): through npx, with nothing installed first. */
const CLI = 'npx @agentinbox/cli';

export type ConnectDetails = {
  /** The agent, as `connect` names it: its address before the `@`. */
  handle: string;
  /** The agent's address, named in the prompt's first line. Left out while the agent has none. */
  address: string | null;
  /** The one-time code that lets a host connect as this agent. */
  code: string;
  /** The API the account lives on. `connect` always names it. */
  apiUrl: string;
};

/**
 * What a host runs to connect with a one-time code, in order. The connect drawer's CLI tab lists them, and
 * its prompt numbers them. `--yes` lets `connect` replace a setup already on the host's computer instead
 * of asking, which an agent without a terminal can't answer. Only `connect` names the API: it saves it,
 * and the commands after it go there by themselves. It names it even when it's the CLI's default, since
 * the CLI prefers `INBOX_API_URL` or an API saved by an earlier setup over its default, and a code works
 * only on the API that made it.
 */
export function connectCommands({ handle, code, apiUrl }: Omit<ConnectDetails, 'address'>) {
  return [
    { label: 'Connect:', command: `${CLI} connect ${handle} --code ${code} --yes --api-url=${apiUrl}` },
    { label: 'Add the skill:', command: `${CLI} skill install` },
    { label: 'Check it works:', command: `${CLI} inbox list` },
  ];
}

/** Where a numbered command starts in the prompt, in characters: after the longest label and two spaces. */
export const PROMPT_COMMAND_COLUMN = 20;

/**
 * The prompt the operator pastes into any agent, line by line, so the page can set the commands apart
 * (`strong`) and the one rule the agent must keep (`accent`). `promptText` turns it into what is copied.
 * No key in it: the one-time code is all the agent gets, and it works once.
 */
export function connectPrompt(details: ConnectDetails): PromptSpan[][] {
  const address = details.address ? ` (${details.address})` : '';

  return [
    [{ text: `Connect to my ${AGENT_DOMAIN} inbox as ${details.handle}${address}.` }],
    [{ text: 'Instructions: ' }, { text: `https://${AGENT_DOMAIN}/agents.md`, tone: 'strong' }],
    [],
    ...connectCommands(details).map(({ label, command }, index): PromptSpan[] => [
      { text: `${index + 1}. ${label}`.padEnd(PROMPT_COMMAND_COLUMN) },
      { text: command, tone: 'strong' },
    ]),
    [],
    [
      { text: 'From now on, run ' },
      { text: `${CLI} inbox list --filter unread`, tone: 'strong' },
      { text: ' at the start of every task.' },
    ],
    [{ text: 'Reply in the same thread. ' }, { text: 'Ask me before you message anyone new.', tone: 'accent' }],
  ];
}
