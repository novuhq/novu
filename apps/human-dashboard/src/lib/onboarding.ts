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

/** Where an agent's public card lives on the site: `/p/atlas`. */
export function cardPathOf(handle: string): string {
  return `/p/${handle}`;
}

/**
 * The agent's public card on the site `origin` names (`readSiteOrigin`): `https://agentinbox.md/p/atlas`, or
 * `http://localhost:4300/p/atlas` locally. Shown as `writtenLink` writes it.
 */
export function cardLinkOf(origin: string, handle: string): string {
  return `${origin}${cardPathOf(handle)}`;
}

/** A link as it is written out, without `https://` or `http://`: `agentinbox.md/p/atlas`. */
export function writtenLink(url: string): string {
  return url.replace(/^https?:\/\//, '');
}

/*
 * The commands below are the CLI's (`packages/agentinbox`), except `connect` with its one-time code,
 * which comes with NV-9037; until then that one shows what the operator will run, not what works today.
 */

/** The CLI's package on npm. Installed with `npm install -g`, its command is `agentinbox`. */
const CLI_PACKAGE = '@agentinbox/cli';
const CLI = 'agentinbox';

/** A command copied on its own runs through npx, which needs nothing installed first. */
const NPX_CLI = `npx ${CLI_PACKAGE}`;

/**
 * The terminal's way to do step 1. It logs in first, which the operator approves in this browser: on its
 * own, `setup` makes an inbox without an account, apart from the one this page waits for.
 * `name` is what the agent is called, the same word the page sends as `agentName`.
 */
export function setupCommand(name: string): string {
  const quoted = /[\s"']/.test(name) ? `"${name.replaceAll('"', '\\"')}"` : name;

  return `${NPX_CLI} login && ${NPX_CLI} setup --agent-name ${quoted}`;
}

export const INSTALL_SKILLS_COMMAND = `${NPX_CLI} skill install`;

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
    { label: 'Connect:', command: `${CLI} connect ${handle} --code ${code}` },
    { label: 'Add the skill:', command: `${CLI} skill install` },
    { label: 'Check it works:', command: `${CLI} inbox list` },
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
    [
      { text: 'From now on, run ' },
      { text: `${CLI} inbox list --filter unread`, tone: 'strong' },
      { text: ' at the start of every task.' },
    ],
    [{ text: 'Reply in the same thread. ' }, { text: 'Ask me before you message anyone new.', tone: 'accent' }],
  ];
}

export function promptText(prompt: PromptSpan[][]): string {
  return prompt.map((line) => line.map((span) => span.text).join('')).join('\n');
}
