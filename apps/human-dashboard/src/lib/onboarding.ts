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

/** The query parameter that starts the "Connect" step on the host it names, as Configure's opens its drawer. */
export const ONBOARDING_CONNECT_PARAM = 'connect';

/**
 * The onboarding with its "Connect" step on a host: where a public host page's "sign in to get your code"
 * (`configureConnectPath`) takes an operator whose setup isn't done yet.
 */
export function onboardingConnectPath(host: string): string {
  return `${ONBOARDING_PATH}?${ONBOARDING_CONNECT_PARAM}=${host}`;
}

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

export function addressOf(handle: string, domain: string = AGENT_DOMAIN): string {
  return `${handle}@${domain}`;
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

/** The CLI's package on npm. Installed with `npm install -g`, its command is `agentinbox`. */
const CLI_PACKAGE = '@agentinbox/cli';

/** A command copied on its own runs through npx, which needs nothing installed first. */
export const NPX_CLI = `npx ${CLI_PACKAGE}`;

/**
 * The terminal's way to do step 1. It logs in first, which the operator approves in this browser: on its
 * own, `setup` makes an inbox without an account, apart from the one this page waits for.
 * `name` is what the agent is called, the same word the page sends as `agentName`.
 */
export function setupCommand(name: string): string {
  const quoted = /[\s"']/.test(name) ? `"${name.replaceAll('"', '\\"')}"` : name;

  return `${NPX_CLI} login && ${NPX_CLI} setup --agent-name ${quoted}`;
}

/** The Agent Inbox skills live in their own repository on GitHub, not in the CLI. */
export const SKILLS_REPO = 'agentinboxhq/skills';

/** Installs the skills with the skills CLI, for the coding agents it finds in the project. */
export const INSTALL_SKILLS_COMMAND = `npx skills add ${SKILLS_REPO}`;

/** What the skills CLI calls each agent it installs for (`--agent claude-code`). */
export const SKILLS_CLI_AGENTS_URL = 'https://github.com/vercel-labs/skills/blob/main/docs/agents.md';
