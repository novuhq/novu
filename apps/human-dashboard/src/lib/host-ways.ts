import { type ConnectDetails, connectCommands } from './connect-prompt';
import { type ChatApp, type CommandHost, type Host, type HostAlternative, hostSubject, MCP_SERVER_NAME } from './hosts';
import { AGENT_DOMAIN } from './onboarding';

/*
 * The ways a host connects in the dashboard's setup box ("Connect another agent" and the onboarding's step 3),
 * one tab each. Only the ways a host really has: the commands for every host that runs them, with its plugin
 * or the MCP server in its own config next to them, and for a chat app the server added in the app, then a
 * prompt to paste once it's there. Grok Bot adds the server itself when asked, so the prompt is all it needs.
 *
 * The first way is the one the box opens on. A coding agent with a second way in opens on it, and its sign-in
 * connects it: its plugin (Claude Code, Codex), which brings the skills and the inbox tools in one install, or
 * the MCP server in its own config (Cursor, OpenCode). Any other host that runs commands opens on them: one
 * paste, no sign-in, and the code connects it to this agent straight away. Hermes has the MCP server in its
 * config after them: it often runs on a server, with no browser there to sign in with. A chat app opens on
 * adding the server, which is how it connects at all.
 */

export type HostWay = 'cli' | 'plugin' | 'mcp' | 'connector' | 'prompt';

export function waysOf(host: Host): HostWay[] {
  if (host.group === 'chat') {
    return host.addsServerWhenAsked ? ['prompt'] : ['connector', 'prompt'];
  }

  if (!host.alternative) {
    return ['cli'];
  }

  const second = host.alternative.kind === 'plugin' ? 'plugin' : 'mcp';

  // An agent on a computer of its own keeps its commands first: they need no browser there, its sign-in does.
  return host.runsIn === 'computer' ? ['cli', second] : [second, 'cli'];
}

/** A way's tab, in the words its host uses: Claude adds a custom connector, ChatGPT a plugin. */
export function wayLabel(host: Host, way: HostWay): string {
  switch (way) {
    case 'cli':
      return 'CLI';
    case 'plugin':
      return 'Plugin';
    case 'mcp':
      return 'MCP';
    case 'connector':
      return host.group === 'chat' && host.addedAs === 'plugin' ? 'Plugin' : 'Connector';
    case 'prompt':
      return 'Prompt';
    default: {
      const exhaustive: never = way;

      return exhaustive;
    }
  }
}

/** A line of the box: a `#` note, a command after its prompt, a config to paste, or a gap between steps. */
export type ScriptLine =
  | { kind: 'note'; text: string }
  | { kind: 'command'; text: string; prompt: '$' | '>' }
  | { kind: 'snippet'; text: string; label: string }
  | { kind: 'gap' };

/**
 * A way that is lines to run (`1.4b · Connect · CLI`): its numbered notes and commands, and what the box's button
 * copies, which is empty where the button opens a link instead. A command or a config the button leaves out
 * gets a copy button of its own (`copiesAlone`).
 */
export type Script = { lines: ScriptLine[]; copy: string };

/** Whether a line needs its own copy button: what the box's button copies doesn't have it. */
export function copiesAlone(script: Script, line: ScriptLine): boolean {
  return (line.kind === 'command' || line.kind === 'snippet') && !script.copy.includes(line.text);
}

/** The commands with the one-time code in them, each under a note on what it does. */
export function cliScript(host: CommandHost, details: ConnectDetails): Script {
  const [connect, skills, check] = connectCommands(details, host).map(({ command }) => command);
  const lines: ScriptLine[] = [
    { kind: 'note', text: `1. Connect this machine to ${details.handle}` },
    { kind: 'command', text: connect, prompt: '$' },
    { kind: 'gap' },
    { kind: 'note', text: `2. Teach ${hostSubject(host)} how to use the inbox` },
    { kind: 'command', text: skills, prompt: '$' },
    { kind: 'gap' },
    { kind: 'note', text: '3. Check it works' },
    { kind: 'command', text: check, prompt: '$' },
  ];
  if (host.afterCommands) {
    lines.push({ kind: 'gap' }, { kind: 'note', text: `4. ${asStep(host.afterCommands)}` });
  }

  return { lines, copy: [connect, skills, check].join('\n') };
}

/** Where the commands run, and how long the code lasts. */
export function cliCaption(host: CommandHost): string {
  const where =
    host.runsIn === 'computer' ? `on the computer ${host.name} runs on` : `where ${hostSubject(host)} works`;

  return `Run it ${where}. The code works once and expires in 10 min.`;
}

/**
 * A host's plugin, from a terminal where it has commands for that (`terminalLines`), then its sign-in. The
 * button copies every command, sign-in included, since a terminal takes them together.
 */
export function pluginScript(host: CommandHost): Script {
  const alternative = host.alternative;
  if (alternative?.kind !== 'plugin') {
    return { lines: [], copy: '' };
  }

  const install = alternative.terminalLines ?? alternative.lines;
  const prompt = alternative.terminalLines || alternative.typedIn === 'terminal' ? '$' : '>';
  const lines: ScriptLine[] = [
    { kind: 'note', text: `1. Install the ${host.name} plugin: the skills and the inbox tools` },
    ...install.map((text): ScriptLine => ({ kind: 'command', text, prompt })),
    { kind: 'gap' },
    ...signInLines(alternative),
  ];

  return { lines, copy: [...install, ...(alternative.signInCommand ? [alternative.signInCommand] : [])].join('\n') };
}

export function pluginCaption(host: CommandHost): string {
  const alternative = host.alternative;
  const inHost = alternative?.kind === 'plugin' && alternative.typedIn === 'host' && !alternative.terminalLines;

  return `${inHost ? `Type them in ${host.name}` : 'Run them in a terminal'}. No code needed: you sign in in the browser.`;
}

/**
 * The MCP server in the host's own config, then its sign-in. A host with a command that adds the server
 * (OpenCode, Hermes) gets that in place of the config, and the button copies it with the sign-in command where
 * there is one, as a terminal takes them together. With a link that adds the server in one click (Add to
 * Cursor), the button is that link and the config gets its own copy button; otherwise the button copies the
 * config and the sign-in command gets its own.
 */
export function mcpScript(host: CommandHost, mcpUrl: string): Script {
  const alternative = host.alternative;
  if (alternative?.kind !== 'mcp-config') {
    return { lines: [], copy: '' };
  }

  if (alternative.addCommand) {
    const add = alternative.addCommand.line(mcpUrl);
    const lines: ScriptLine[] = [
      { kind: 'note', text: `1. ${asStep(alternative.addCommand.text)}:` },
      { kind: 'command', text: add, prompt: '$' },
      { kind: 'gap' },
      ...signInLines(alternative),
    ];

    return { lines, copy: [add, ...(alternative.signInCommand ? [alternative.signInCommand] : [])].join('\n') };
  }

  const config = alternative.config(mcpUrl);
  const lines: ScriptLine[] = [
    { kind: 'note', text: `1. ${asStep(alternative.text)}:` },
    { kind: 'snippet', text: config, label: `Copy the ${alternative.file} config` },
    { kind: 'gap' },
    ...signInLines(alternative),
  ];

  return { lines, copy: alternative.installLink ? '' : config };
}

/**
 * How the host signs in to Agent Inbox: the words alone, or the first of them and the command. Then, for a host
 * that only connects after that (`afterSignIn`), what makes it connect.
 */
function signInLines({ signIn, signInCommand, afterSignIn }: HostAlternative): ScriptLine[] {
  const after: ScriptLine[] = afterSignIn ? [{ kind: 'gap' }, { kind: 'note', text: `3. ${asStep(afterSignIn)}` }] : [];
  if (!signInCommand) {
    return [{ kind: 'note', text: `2. ${asStep(signIn)}` }, ...after];
  }

  // What follows the first sentence says how to check, which reads wrong ahead of the command.
  return [
    { kind: 'note', text: `2. ${asStep(signIn.split('. ')[0])}` },
    { kind: 'command', text: signInCommand, prompt: '$' },
    ...after,
  ];
}

export function mcpCaption(host: CommandHost): string {
  const alternative = host.alternative;
  // OpenCode signs in with a command of its own; Hermes within the one that adds the server.
  const run =
    alternative?.kind === 'mcp-config' && alternative.addCommand
      ? `Run ${alternative.signInCommand ? 'them' : 'it'} in a terminal. `
      : '';

  return `${run}No code needed: ${host.name} signs in to Agent Inbox in the browser.`;
}

/** A chat app's steps in its settings, with the server's address after the step that pastes it (`1.4c`). */
export function connectorSteps(host: ChatApp, mcpUrl: string): Array<{ text: string; paste?: string }> {
  return host.steps.map((step) => ({ text: step.text, paste: step.copy?.value(mcpUrl) }));
}

export const CONNECTOR_CAPTION = 'Takes about a minute. No code to copy.';

/** A stretch of the prompt: what the agent does (`strong`), and the one rule it must keep (`accent`). */
export type PromptSpan = { text: string; tone?: 'strong' | 'accent' };

type PromptDetails = {
  handle: string;
  /** The agent's address, named after it. Left out where the page doesn't know it. */
  address?: string | null;
  mcpUrl: string;
};

/**
 * What the operator pastes into a chat app, line by line (`1.4 · Connect · prompt`, without the commands a
 * chat app can't run). Grok Bot is first asked for the server, which it adds itself. No key and no code in
 * it: the app signs in, and the inbox it reaches is the one the operator approves.
 */
export function chatPrompt(host: ChatApp, { handle, address, mcpUrl }: PromptDetails): PromptSpan[][] {
  const named = address ? ` (${address})` : '';
  const request: PromptSpan[][] = host.addsServerWhenAsked
    ? [[{ text: `Add a custom MCP server called ${MCP_SERVER_NAME} at ${mcpUrl}`, tone: 'strong' }], []]
    : [];

  return [
    ...request,
    [{ text: `Connect to my ${AGENT_DOMAIN} inbox as ${handle}${named}.` }],
    [{ text: `Instructions: https://${AGENT_DOMAIN}/agents.md` }],
    [],
    [{ text: 'From now on, check the inbox at the start of every task.' }],
    [{ text: 'Ask me before you message anyone new.', tone: 'accent' }],
  ];
}

/** The prompt as it is copied. */
export function promptText(prompt: PromptSpan[][]): string {
  return prompt.map((line) => line.map(({ text }) => text).join('')).join('\n');
}

export function promptCaption(host: ChatApp): string {
  return host.addsServerWhenAsked
    ? `Send it to ${host.name}, say Add it, then click Authorize on the card it shows.`
    : `Paste it into ${host.name} once Inbox is added there.`;
}

/** A host's sentence as a step of its own: "Then run /mcp…" reads "Run /mcp…", without its full stop. */
function asStep(sentence: string): string {
  const step = sentence.replace(/^Then /, '').replace(/[.:]$/, '');

  return step.charAt(0).toUpperCase() + step.slice(1);
}
