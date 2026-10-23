/** Matches the API's `AGENT_HOST_IDS`: the hosts Agent Inbox tells apart. `general` is any other host. */
export const HOST_IDS = [
  'claude-code',
  'codex',
  'opencode',
  'cursor',
  'hermes',
  'openclaw',
  'general',
  'claude',
  'chatgpt',
  'grok',
] as const;

export type HostId = (typeof HOST_IDS)[number];

export function isHostId(value: unknown): value is HostId {
  return typeof value === 'string' && (HOST_IDS as readonly string[]).includes(value);
}

type Env = Record<string, string | undefined>;

/** A variable set to `value`, or to anything but blank when no value is given. */
type Condition = readonly [variable: string, value?: string | RegExp];

/** A host, when all of its conditions hold. */
type Marker = { host: HostId; when: readonly Condition[] };

/**
 * What each host puts in the environment of the commands its agent runs, as the host's own code or docs show
 * it. Only variables a host sets for its agent's commands count: a person typing in an app's terminal isn't a
 * host, so `CLAUDECODE=1` on its own (Claude Code's IDE extensions set it in every terminal), Cursor's
 * `CURSOR_TRACE_ID`, `TERM_PROGRAM` and the like say nothing here.
 *
 * Every variable is passed on to whatever the command starts, so a host started by another host's agent has
 * both hosts' variables, and nothing in them tells which one is inside. Then the first host here wins: the ones
 * other hosts start as helpers (Codex from Claude Code, Claude Code from Cursor, Hermes or OpenClaw) come first.
 */
const MARKERS: readonly Marker[] = [
  // Codex sets the thread on every command it runs; `CODEX_CI` with its unified exec, on by default; the sandbox
  // variable only under macOS's sandbox.
  { host: 'codex', when: [['CODEX_THREAD_ID']] },
  { host: 'codex', when: [['CODEX_CI', '1']] },
  { host: 'codex', when: [['CODEX_SANDBOX']] },
  // Claude Code 2.1.120 and later: `claude-code_2-1-309_agent` on each command of its Bash tool. Before that, the
  // child session flag, which its IDE extensions' terminals don't have.
  { host: 'claude-code', when: [['AI_AGENT', /^claude-code_.+_agent$/]] },
  {
    host: 'claude-code',
    when: [
      ['CLAUDECODE', '1'],
      ['CLAUDE_CODE_CHILD_SESSION', '1'],
    ],
  },
  // OpenCode 1 sets `OPENCODE=1` for everything it starts; OpenCode 2 the session on its agent's shell.
  { host: 'opencode', when: [['OPENCODE', '1']] },
  { host: 'opencode', when: [['OPENCODE_SESSION_ID']] },
  { host: 'opencode', when: [['AI_AGENT', 'opencode']] },
  // Cursor's agent, in the editor and in `cursor-agent`; the sandbox variable only inside its sandbox.
  { host: 'cursor', when: [['CURSOR_AGENT']] },
  { host: 'cursor', when: [['CURSOR_EXTENSION_HOST_ROLE', 'agent-exec']] },
  { host: 'cursor', when: [['CURSOR_SANDBOX']] },
  { host: 'hermes', when: [['HERMES_AGENT']] },
  { host: 'hermes', when: [['AI_AGENT', 'hermes-agent']] },
  { host: 'hermes', when: [['HERMES_SESSION_ID']] },
  // Only OpenClaw's exec tool: `tui-local` is a person typing in its terminal.
  { host: 'openclaw', when: [['OPENCLAW_SHELL', 'exec']] },
];

/** Every variable `detectHost` reads. */
export const HOST_MARKER_VARIABLES: readonly string[] = [
  ...new Set(MARKERS.flatMap((marker) => marker.when.map(([variable]) => variable))),
];

function holds(env: Env, [variable, value]: Condition): boolean {
  const set = env[variable]?.trim() ?? '';
  if (value === undefined) {
    return set.length > 0;
  }

  return typeof value === 'string' ? set === value : value.test(set);
}

/**
 * Which host runs this CLI, from the environment its agent started it in. `null` when nothing says: a person
 * in a terminal, a scheduled job, or a host that sets nothing Agent Inbox knows.
 */
export function detectHost(env: Env = process.env): HostId | null {
  return MARKERS.find((marker) => marker.when.every((condition) => holds(env, condition)))?.host ?? null;
}
