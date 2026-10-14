/** The four steps a new operator goes through after signing up, in order (Figma: Sign up [from dashboard]). */
export const ONBOARDING_STEPS = ['address', 'test', 'connect', 'reach'] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const STEP_LABELS: Record<OnboardingStep, string> = {
  address: 'Address',
  test: 'Test',
  connect: 'Connect',
  reach: 'Reach',
};

/** The onboarding has one address. Which step it shows comes from how far the setup got. */
export const ONBOARDING_PATH = '/onboarding';

/** Where agent addresses and their public cards live. */
export const AGENT_DOMAIN = 'agentinbox.md';

/** As long as the API lets an agent's name be (`AGENT_NAME_MAX_LENGTH` in `@novu/shared`). */
export const AGENT_NAME_MAX_LENGTH = 60;

/** The part of an address before the `@` stays short enough to say out loud. */
export const HANDLE_MAX_LENGTH = 32;

/** What stands in for the agent's name and address until the operator has typed a name on step 1. */
export const PLACEHOLDER_NAME = 'Your agent';
export const PLACEHOLDER_HANDLE = 'your-agent';

/** How a host reached the agent: the CLI in a terminal, or a connector in ChatGPT or Claude. */
export type HostVia = 'cli' | 'mcp';

export const HOST_LABELS: Record<HostVia, string> = { cli: 'CLI', mcp: 'MCP' };

/**
 * The address a name turns into: "Atlas Prime" becomes `atlas-prime`. Letters, digits and single
 * hyphens only, so it reads the same in an email address, a link and a terminal command.
 */
export function toHandle(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, HANDLE_MAX_LENGTH)
    .replace(/-+$/, '');
}

export function addressOf(handle: string): string {
  return `${handle}@${AGENT_DOMAIN}`;
}

/** The agent's public card, as it is written out. Add `https://` to open or copy it. */
export function cardLinkOf(handle: string): string {
  return `${AGENT_DOMAIN}/${handle}`;
}

/*
 * The commands below are the ones in the design. The CLI gets these names with NV-9033 and the
 * one-time code with NV-9037; until then they show what the operator will run, not what works today.
 */

/** The CLI's package on npm. Installed, its command is `inbox`. */
const CLI_PACKAGE = '@agentinbox/cli';

/** The terminal's way to do step 1. */
export function setupCommand(handle: string): string {
  return `npx ${CLI_PACKAGE} setup --name ${handle}`;
}

export const INSTALL_SKILLS_COMMAND = 'inbox skills add';

type ConnectDetails = {
  handle: string;
  address: string;
  /** The one-time code that lets a host connect as this agent. */
  code: string;
};

/** What a host runs to connect, in order. The CLI tab of step 3 lists them. */
export function connectCommands({ handle, code }: Pick<ConnectDetails, 'handle' | 'code'>) {
  return [
    { label: 'Install the CLI:', command: `npm install -g ${CLI_PACKAGE}` },
    { label: 'Connect:', command: `inbox connect ${handle} --code ${code}` },
    { label: 'Add the skill:', command: INSTALL_SKILLS_COMMAND },
    { label: 'Check it works:', command: 'inbox list' },
  ];
}

/** A stretch of the prompt. `strong` is what the host acts on; `accent` is the one rule it must keep. */
export type PromptSpan = { text: string; tone?: 'strong' | 'accent' };

/**
 * The prompt the operator pastes into their agent, line by line, so the page can set the commands
 * apart. `promptText` is the same prompt as the plain text that gets copied.
 */
export function connectPrompt(details: ConnectDetails): PromptSpan[][] {
  const commands = connectCommands(details);
  const labelWidth = Math.max(...commands.map(({ label }) => label.length)) + 5;

  return [
    [{ text: `Connect to my ${AGENT_DOMAIN} inbox as ${details.handle} (${details.address}).` }],
    [{ text: 'Instructions: ' }, { text: `https://${AGENT_DOMAIN}/agents.md`, tone: 'strong' }],
    [],
    ...commands.map(({ label, command }, index): PromptSpan[] => [
      { text: `${index + 1}. ${label}`.padEnd(labelWidth) },
      { text: command, tone: 'strong' },
    ]),
    [],
    [{ text: 'From now on, run ' }, { text: 'inbox unread', tone: 'strong' }, { text: ' at the start of every task.' }],
    [{ text: 'Reply in the same thread. ' }, { text: 'Ask me before you message anyone new.', tone: 'accent' }],
  ];
}

export function promptText(prompt: PromptSpan[][]): string {
  return prompt.map((line) => line.map((span) => span.text).join('')).join('\n');
}
