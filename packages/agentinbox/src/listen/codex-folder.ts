import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import {
  chainFolders,
  chainParts,
  commandNames,
  commandReachesKey,
  type Decision,
  decidingCheck,
  type KeyGuard,
  keyGuardFor,
  namesPathTo,
  realTarget,
  within,
} from './contact-guard';
import { CONVERSATION_TOOLS_SERVER } from './conversation-tools';
import type { HostProgram } from './host-adapter';
import { clip, errorText, isRecord, stringOf } from './host-program';
import { realPathOf, simpleCommandWords } from './own-replies';

/**
 * What a contact's run may do in Codex: what the folder's own Codex settings allow, and nothing else.
 *
 * - Only the folder's own `.codex` counts, and only when Codex loads it, which it does for a folder the operator
 *   trusts in Codex. The operator's own config in `~/.codex` (its MCP servers, skills and hooks) is off.
 * - Commands go by the folder's rules (`.codex/rules/*.rules`), as `codex execpolicy check` reads them: `allow` runs,
 *   `prompt` sends the operator a card, and `forbidden`, or no rule at all, refuses with no card.
 * - Codex has no rule that allows edits, so a contact's run edits nothing.
 * - The folder's skills are only instructions: reading them needs no rule. Running their scripts does.
 * - The folder's MCP servers stay, as its settings have them, and so do its web search and the tools it turns on
 *   itself. The run's own conversation tools (`conversation-tools.ts`) always work.
 * - Agent Inbox's key (`~/.agentinbox`, or the file `INBOX_CONFIG` points at) stays closed, whatever a rule says
 *   (`contact-guard.ts`): only full access opens it.
 * - A command its rules allow that would change what decides a run (the folder's `.codex`, `.agents`, `AGENTS.md`, or
 *   git's own files) is refused: Codex runs what its rules allow without asking, and its check can't ask either.
 *
 * Codex checks each tool call with a hook the listener gives it (`agentinbox contact-check`), which goes by this, and
 * asks the listener before anything else, which goes by this too.
 */
export interface CodexFolder {
  project: string;
  /** The folder's rules files, from each of its `.codex` folders that Codex loads. */
  rules: string[];
  /** Where each of the folder's skills is. */
  skills: string[];
  /** The folder's MCP servers, by name. */
  servers: string[];
  /** The operator's own MCP servers, by name: off for the run. */
  otherServers: string[];
  /** Skills that aren't the folder's (the operator's own, Codex's), by their `SKILL.md`: off for the run. */
  otherSkills: string[];
  /** Hooks that aren't the folder's, by Codex's key for them: off for the run. */
  otherHooks: string[];
  /** The folder's own web search, when it sets one. */
  webSearch?: string;
  /** The tools a contact's run goes without (`CONTACT_FEATURES`) that the folder turns on itself. */
  features: string[];
  /** The folder's own developer instructions. */
  instructions?: string;
  /** What keeps Agent Inbox's key from the run. */
  guard: KeyGuard;
}

/**
 * Codex's tools that reach beyond the conversation and the folder's rules, which a contact's run goes without unless
 * the folder turns them on itself: images from disk, apps and plugins, more agents, a browser or the computer, images
 * made, suggested installs, and the operator's memories.
 */
export const CONTACT_FEATURES = [
  'view_image',
  'apps',
  'plugins',
  'remote_plugin',
  'multi_agent',
  'multi_agent_v2',
  'browser_use',
  'browser_use_external',
  'in_app_browser',
  'computer_use',
  'image_generation',
  'tool_suggest',
  'skill_mcp_dependency_install',
  'request_permissions_tool',
  'standalone_web_search',
  'memories',
  'goals',
];

/** The variable the hook finds the folder in: what the listener read of it, and the Codex that checks its rules. */
export const FOLDER_VARIABLE = 'AGENTINBOX_CODEX_FOLDER';

/** The variables the run's conversation tools need from the listener's environment, besides the home folder. */
const HELPER_VARIABLES = ['INBOX_CONFIG'];

/** The folder's files that decide what a run does. */
const DECIDING = ['.codex', '.agents', 'AGENTS.md', 'AGENTS.override.md', '.git'];

/** Tools that only plan, ask the person or wait: nothing to allow. */
const HARMLESS = new Set(['update_plan', 'request_user_input', 'sleep']);

/** MCP's own tools for a server's resources: only the servers the run has. */
const RESOURCE_TOOLS = new Set(['list_mcp_resources', 'list_mcp_resource_templates', 'read_mcp_resource']);

/** The names Codex gives its shell tool in a hook. */
const SHELL_TOOLS = new Set(['Bash', 'shell', 'local_shell', 'exec_command', 'unified_exec']);

/** Commands that only read the files they are given, and the options of theirs that take a value. */
const READERS: Record<string, readonly string[]> = {
  cat: [],
  head: ['-n', '-c'],
  tail: ['-n', '-c'],
  ls: [],
  wc: [],
  nl: [],
  sed: [],
};

/** How long a check of the folder's rules may take. */
const CHECK_TIMEOUT_MS = 20_000;

/** What Codex says when it reads the config, with its layers (`config/read` with `includeLayers`). */
export interface CodexConfigRead {
  config?: Record<string, unknown> | null;
  layers?: Array<{
    name?: { type?: string; dotCodexFolder?: string } | null;
    config?: unknown;
    disabledReason?: string | null;
  }> | null;
}

/** What `skills/list` says, for the folder. */
export interface CodexSkillsList {
  data?: Array<{ skills?: Array<{ path?: string; scope?: string }> }>;
}

/** What `hooks/list` says, for the folder. */
export interface CodexHooksList {
  data?: Array<{ hooks?: CodexHook[] }>;
}

export interface CodexHook {
  key?: string;
  source?: string;
  command?: string | null;
  currentHash?: string;
  trustStatus?: string;
  enabled?: boolean;
  isManaged?: boolean;
}

/**
 * What the folder's own settings say, as Codex reads them for the folder (`read`, `skills`, `hooks`), and the
 * listener's hook among the hooks (`check`, its command), which the run trusts by its hash. The key is where the CLI
 * finds it: `configFile` when `INBOX_CONFIG` names one.
 */
export function readCodexFolder(
  project: string,
  lists: { read: CodexConfigRead; skills: CodexSkillsList; hooks: CodexHooksList },
  check: string,
  home: string = homedir(),
  configFile: string | undefined = process.env.INBOX_CONFIG
): { folder: CodexFolder; hook?: CodexHook } {
  // The project's layers that Codex loads, the one nearest the folder first, as Codex lists them.
  const layers = (lists.read.layers ?? []).flatMap((layer) =>
    layer.name?.type === 'project' && layer.name.dotCodexFolder && !layer.disabledReason
      ? [{ folder: layer.name.dotCodexFolder, config: isRecord(layer.config) ? layer.config : {} }]
      : []
  );
  const servers = new Set(
    layers.flatMap(({ config }) =>
      Object.entries(isRecord(config.mcp_servers) ? config.mcp_servers : {})
        .filter(([name, server]) => name !== CONVERSATION_TOOLS_SERVER && defines(server))
        .map(([name]) => name)
    )
  );
  const allServers = Object.keys(isRecord(lists.read.config?.mcp_servers) ? lists.read.config.mcp_servers : {});
  const skills = lists.skills.data?.flatMap((entry) => entry.skills ?? []) ?? [];
  const hooks = lists.hooks.data?.flatMap((entry) => entry.hooks ?? []) ?? [];
  const hook = hooks.find((each) => each.source === 'sessionFlags' && each.command === check);
  const webSearch = layers.map(({ config }) => stringOf(config.web_search)).find(Boolean);
  const instructions = layers.map(({ config }) => stringOf(config.developer_instructions)).find(Boolean);

  return {
    folder: {
      project,
      rules: layers.flatMap(({ folder }) => rulesIn(join(folder, 'rules'))),
      skills: skills.flatMap((skill) => (skill.scope === 'repo' && skill.path ? [dirname(skill.path)] : [])),
      servers: [...servers],
      otherServers: allServers.filter((name) => !servers.has(name) && name !== CONVERSATION_TOOLS_SERVER),
      otherSkills: skills.flatMap((skill) => (skill.scope !== 'repo' && skill.path ? [skill.path] : [])),
      otherHooks: hooks.flatMap((each) =>
        each !== hook && each.source !== 'project' && !each.isManaged && each.key ? [each.key] : []
      ),
      ...(webSearch ? { webSearch } : {}),
      features: CONTACT_FEATURES.filter((name) =>
        layers.some(({ config }) => isRecord(config.features) && config.features[name] === true)
      ),
      ...(instructions ? { instructions } : {}),
      guard: keyGuardFor(project, home, configFile),
    },
    ...(hook ? { hook } : {}),
  };
}

/**
 * What a contact's thread goes without, on top of the operator's config: the tools of `CONTACT_FEATURES` the folder
 * doesn't turn on, the shell when there is nothing it may run, web search unless the folder searches, the
 * operator's own MCP servers and skills; and what it gets: its own conversation tools.
 */
export function contactThreadConfig(folder: CodexFolder, helper: HostProgram): Record<string, unknown> {
  const shell = folder.rules.length > 0 || folder.skills.length > 0;

  return {
    features: {
      ...Object.fromEntries(
        CONTACT_FEATURES.filter((name) => !folder.features.includes(name)).map((name) => [name, false])
      ),
      ...(shell ? {} : { shell_tool: false, unified_exec: false }),
    },
    web_search: folder.webSearch ?? 'disabled',
    mcp_servers: {
      ...Object.fromEntries(folder.otherServers.map((name) => [name, { enabled: false }])),
      [CONVERSATION_TOOLS_SERVER]: { command: helper.command, args: [...helper.args], env_vars: HELPER_VARIABLES },
    },
    ...(folder.otherSkills.length > 0
      ? { skills: { config: folder.otherSkills.map((path) => ({ path, enabled: false })) } }
      : {}),
  };
}

/**
 * The flags `codex app-server` takes the listener's hook with (`check`, its command): hooks on, the hook for every
 * tool call, and, once its hash is known (`trust`), the hook trusted and the hooks that aren't the folder's off.
 */
export function contactHookFlags(check: string, trust?: { hook: CodexHook; off: readonly string[] }): string[] {
  const flags = [
    'features.hooks=true',
    `hooks.PreToolUse=[{matcher="*",hooks=[{type="command",command=${toml(check)},timeout=60}]}]`,
  ];
  if (trust?.hook.key && trust.hook.currentHash) {
    const state = [
      `${toml(trust.hook.key)}={trusted_hash=${toml(trust.hook.currentHash)}}`,
      ...trust.off.map((key) => `${toml(key)}={enabled=false}`),
    ];
    flags.push(`hooks.state={${state.join(',')}}`);
  }

  return flags.flatMap((flag) => ['-c', flag]);
}

/** A program as one line of a shell command, its words quoted where the shell would read them otherwise. */
export function shellLine(program: HostProgram): string {
  return [program.command, ...program.args]
    .map((word) => (/^[A-Za-z0-9@%+=:,./_-]+$/.test(word) ? word : `'${word.replace(/'/g, `'\\''`)}'`))
    .join(' ');
}

/** One tool call of a contact's run, as Codex's hook gives it. */
export interface CodexCall {
  tool: string;
  input: Record<string, unknown>;
  /** Where it runs: the folder, unless Codex says another. */
  cwd?: string;
}

/** What the folder's rules say about a command's words: the strictest rule that matches, and what each matched. */
export interface RuleMatch {
  decision?: 'allow' | 'prompt' | 'forbidden';
  prefixes: string[][];
}

export type RuleCheck = (words: string[]) => Promise<RuleMatch>;

/** What a contact's run may do about a call, what the call is as a person reads it, and why, when it may not. */
export interface Verdict {
  decision: Decision;
  what: string;
  why?: string;
}

/** What a contact's run may do about one tool call, by the folder's own Codex settings. */
export async function decideCodexTool(folder: CodexFolder, call: CodexCall, check: RuleCheck): Promise<Verdict> {
  const cwd = call.cwd || folder.project;
  if (SHELL_TOOLS.has(call.tool)) {
    const command = commandOf(call.input);

    return decideCommand(folder, command, cwd, check);
  }
  if (call.tool === 'apply_patch') {
    return { decision: 'deny', what: editsOf(call.input), why: 'Codex has no rule that allows edits' };
  }
  if (call.tool.startsWith('mcp__')) {
    const [, server = '', ...tool] = call.tool.split('__');
    const what = `${tool.join('__') || 'a tool'} of ${server}`;

    return server === CONVERSATION_TOOLS_SERVER || folder.servers.includes(server)
      ? { decision: 'allow', what }
      : { decision: 'deny', what, why: 'that MCP server isn’t the folder’s' };
  }
  if (RESOURCE_TOOLS.has(call.tool)) {
    const server = stringOf(call.input.server);

    return !server || server === CONVERSATION_TOOLS_SERVER || folder.servers.includes(server)
      ? { decision: 'allow', what: call.tool }
      : { decision: 'deny', what: `${call.tool} of ${server}`, why: 'that MCP server isn’t the folder’s' };
  }
  if (
    HARMLESS.has(call.tool) ||
    (call.tool === 'view_image' && folder.features.includes('view_image')) ||
    (call.tool === 'web_search' && Boolean(folder.webSearch) && folder.webSearch !== 'disabled')
  ) {
    return { decision: 'allow', what: call.tool };
  }

  return { decision: 'deny', what: call.tool, why: 'the folder’s Codex settings don’t turn it on' };
}

/**
 * A command, part by part: a chain joined by `&&` is decided by its parts, and asks when one part asks. Anything the
 * shell would work out for itself (pipes, `;`, redirections, variables, file name patterns) is refused: what it would
 * run can't be told from its words. So is a command that could reach the key, whatever a rule says.
 */
async function decideCommand(folder: CodexFolder, command: string, cwd: string, check: RuleCheck): Promise<Verdict> {
  const what = `\`${clip(command.replace(/\s+/g, ' ').trim(), 200)}\``;
  const refuse = (why: string): Verdict => ({ decision: 'deny', what, why });
  const parts = chainParts(command)?.map((raw) => ({ raw, words: simpleCommandWords(raw) }));
  if (!parts || parts.some((part) => !part.words)) {
    return refuse('only plain commands are checked, alone or joined with &&');
  }
  if (commandReachesKey(command, cwd, folder.guard)) {
    return refuse('it could reach Agent Inbox’s key');
  }

  // Each command runs where a `cd` before it left the shell.
  const folders = chainFolders(
    parts.map((part) => part.raw),
    cwd,
    folder.guard.home
  );
  if (!folders) {
    return refuse('it changes folders in a way that can’t be followed');
  }

  let decision: Decision = 'allow';
  for (const [at, { raw, words }] of parts.entries()) {
    const read = plainRead(words ?? []);
    if (read && read.length > 0 && read.every((path) => inSkills(path, folder, folders[at]))) {
      continue;
    }
    const match = await check(words ?? []);
    if (match.decision === 'forbidden') {
      return refuse('a rule in the folder’s Codex settings forbids it');
    }
    if (!match.decision) {
      return refuse('no rule in the folder’s Codex settings allows it');
    }
    if (!read && match.decision === 'allow' && namesDeciding(raw, words ?? [], folders[at], folder)) {
      return refuse('it would change the folder’s own settings or instructions');
    }
    if (match.decision === 'prompt') {
      decision = 'ask';
    }
  }

  return { decision, what };
}

/**
 * The files a command only reads, when that is all it does (`cat`, `head`, `sed -n '1,80p'`…), or undefined. Only
 * the system's command, never one of the folder's own of that name.
 */
function plainRead(words: string[]): string[] | undefined {
  const [program = '', ...rest] = words;
  const name = basename(program);
  if (!(name in READERS) || (program !== name && !/^\/(usr\/)?bin\//.test(program))) {
    return undefined;
  }

  return name === 'sed' ? sedPrints(rest) : filesOf(rest, READERS[name]);
}

/** The files among a command's words: what isn't an option, nor the value of one that takes a value (`valued`). */
function filesOf(words: string[], valued: readonly string[]): string[] {
  const files: string[] = [];
  for (let at = 0; at < words.length; at++) {
    const word = words[at];
    if (!word.startsWith('-') || word === '-') {
      files.push(word);
    } else if (valued.includes(word)) {
      at += 1;
    }
  }

  return files;
}

/** `sed -n '1,80p' <files>`: the files it only prints lines of, or undefined when it could do more (`sed` writes too). */
function sedPrints(words: string[]): string[] | undefined {
  const options = words.filter((word) => word.startsWith('-') && word !== '-');
  const [script, ...files] = words.filter((word) => !word.startsWith('-') || word === '-');
  const printsOnly = script !== undefined && /^(\d+|\$)?(,(\d+|\$))?p$/.test(script);

  return options.length > 0 && options.every((option) => option === '-n') && printsOnly ? files : undefined;
}

/**
 * Whether one command of a chain names what decides a run: by its words, or by a path that leads there through a
 * link, or that a link among it leads to.
 */
function namesDeciding(raw: string, words: string[], cwd: string, folder: CodexFolder): boolean {
  return (
    commandNames(raw, DECIDING) ||
    namesPathTo(words, cwd, folder.guard.home, decidingCheck(realPathOf(folder.project), DECIDING))
  );
}

/** Whether a path a command reads is in one of the folder's skills, its links followed. */
function inSkills(path: string, folder: CodexFolder, cwd: string): boolean {
  const full = path === '~' || path.startsWith('~/') ? join(folder.guard.home, path.slice(1)) : resolve(cwd, path);
  const real = realTarget(full);

  return folder.skills.some((skill) => within(real, realPathOf(skill)));
}

/** A command from a hook's input: Codex gives it as a line, or as its words. */
function commandOf(input: Record<string, unknown>): string {
  const given = input.command ?? input.cmd;
  if (Array.isArray(given)) {
    return given.filter((word): word is string => typeof word === 'string').join(' ');
  }

  return stringOf(given) ?? '';
}

/** The files a patch would change, as a person reads them. */
function editsOf(input: Record<string, unknown>): string {
  const patch = stringOf(input.command) ?? stringOf(input.input) ?? stringOf(input.patch) ?? '';
  const files = [...patch.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm)].map((found) => found[1].trim());

  return files.length > 0 ? `editing ${files.join(', ')}` : 'editing files';
}

/**
 * The folder's rules, as Codex reads them: `codex execpolicy check` for each command's words. Without rules, nothing
 * matches.
 */
export function execPolicyCheck(codex: HostProgram, rules: readonly string[], env?: NodeJS.ProcessEnv): RuleCheck {
  return async (words) => {
    if (rules.length === 0) {
      return { prefixes: [] };
    }

    const output = await run(
      codex.command,
      [
        ...codex.args,
        'execpolicy',
        'check',
        '--resolve-host-executables',
        ...rules.flatMap((file) => ['--rules', file]),
        '--',
        ...words,
      ],
      env
    );
    const parsed = JSON.parse(output) as { decision?: unknown; matchedRules?: unknown };
    const matched = Array.isArray(parsed.matchedRules) ? parsed.matchedRules : [];
    const decision = parsed.decision;

    return {
      ...(decision === 'allow' || decision === 'prompt' || decision === 'forbidden' ? { decision } : {}),
      prefixes: matched.flatMap((rule) => {
        const prefix =
          isRecord(rule) && isRecord(rule.prefixRuleMatch) ? rule.prefixRuleMatch.matchedPrefix : undefined;

        return Array.isArray(prefix) ? [prefix.filter((word): word is string => typeof word === 'string')] : [];
      }),
    };
  };
}

/** What the agent is told when its call is refused, and what the listener logs: one shape for both. */
const REFUSED_NOTE =
  'In a contact’s conversation only what this folder’s settings allow works, so don’t look for another way.';

export function refusalOf(verdict: Verdict): string {
  return `Refused: ${verdict.what}, as ${verdict.why ?? 'the folder’s settings don’t allow it'}. ${REFUSED_NOTE}`;
}

/** What was refused and why, out of what the hook said; undefined when it isn't a refusal of ours. */
export function readRefusal(text: string): { what: string; why: string } | undefined {
  const found = /^Refused: (.+), as (.+?)\. In a contact’s conversation/s.exec(text.trim());

  return found ? { what: found[1], why: found[2] } : undefined;
}

/**
 * What the hook answers Codex about one tool call (`input`, as Codex gives it): a refusal, or nothing, which lets
 * Codex go on as the folder's settings say. Anything it can't read, or a check that fails, is a refusal.
 */
export async function codexHookAnswer(input: string, env: NodeJS.ProcessEnv, check?: RuleCheck): Promise<string> {
  let what = 'this tool call';
  try {
    const call = JSON.parse(input) as { tool_name?: unknown; tool_input?: unknown; cwd?: unknown };
    what = stringOf(call.tool_name) ?? what;
    const given = JSON.parse(env[FOLDER_VARIABLE] ?? '') as { folder?: CodexFolder; codex?: HostProgram };
    if (!given.folder || !given.codex) {
      throw new Error('the listener didn’t say what this folder allows');
    }
    const verdict = await decideCodexTool(
      given.folder,
      {
        tool: stringOf(call.tool_name) ?? '',
        input: isRecord(call.tool_input) ? call.tool_input : {},
        ...(stringOf(call.cwd) ? { cwd: stringOf(call.cwd) } : {}),
      },
      check ?? execPolicyCheck(given.codex, given.folder.rules, env)
    );

    return verdict.decision === 'deny' ? hookDeny(refusalOf(verdict)) : '';
  } catch (err) {
    return hookDeny(refusalOf({ decision: 'deny', what, why: `the check didn’t work (${errorText(err)})` }));
  }
}

function hookDeny(reason: string): string {
  return JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  });
}

/** Whether a server's config says where it is: a command to start, or an address. */
function defines(server: unknown): boolean {
  return isRecord(server) && (typeof server.command === 'string' || typeof server.url === 'string');
}

/** The rules files in a folder, in order. */
function rulesIn(folder: string): string[] {
  try {
    return readdirSync(folder)
      .filter((name) => name.endsWith('.rules'))
      .sort()
      .map((name) => join(folder, name));
  } catch {
    return [];
  }
}

/** A string as TOML writes one. */
function toml(value: string): string {
  return JSON.stringify(value);
}

/** Runs a program and gives back what it printed, or fails with what it said. */
function run(command: string, args: string[], env?: NodeJS.ProcessEnv): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { env: env ?? process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('the check took too long'));
    }, CHECK_TIMEOUT_MS);
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = `${stderr}${chunk.toString()}`.slice(-2000);
    });
    child.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.once('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolvePromise(stdout);
      } else {
        reject(new Error(stderr.trim().split('\n').pop() || `it stopped with exit code ${code}`));
      }
    });
  });
}
