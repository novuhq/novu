import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import {
  chainParts,
  commandLeadsTo,
  commandReachesKey,
  type Decision,
  decidingCheck,
  type KeyGuard,
  keyGuardFor,
  reachesKey,
  realTarget,
} from './contact-guard';
import { CONVERSATION_TOOLS_SERVER } from './conversation-tools';
import type { HostProgram } from './host-adapter';
import { isRecord, stringOf } from './host-program';
import type { Rule } from './opencode';
import { realPathOf, simpleCommandWords } from './own-replies';

/**
 * What a contact's run may do in OpenCode: what the folder's own OpenCode settings allow, and nothing else.
 *
 * - Only the folder's own settings count: its `opencode.json` (or `.jsonc`), and `.opencode/opencode.json`, in the
 *   folder and the folders above it up to its git root, as OpenCode finds them. The operator's own config is left
 *   out.
 * - The session's rules start with everything refused, then the folder's rules, which OpenCode goes by as it does
 *   (the last rule that fits decides): `allow` runs, `ask` sends the operator a card, `deny` refuses. A rule that
 *   names no tool (`"permission": "allow"`, or `*`) doesn't count, nor one for an MCP server that isn't the folder's.
 * - What the folder's rules allow of reading, editing, searching and commands, OpenCode asks the listener about
 *   (`decideOpenCodeCall`), which lets it through unless it could reach the key: OpenCode only sees the words of a
 *   command or a path, never where links lead or what the shell makes of quotes and patterns. As for Claude Code,
 *   what the shell works out for itself (pipes, variables, command substitution) only a rule for every command
 *   covers.
 * - The folder's skills need no rule, unless one of its rules names them; the person can always be asked a question,
 *   and the run's own conversation tools (`conversation-tools.ts`) always work.
 * - Agent Inbox's key (`~/.agentinbox`, or the file `INBOX_CONFIG` points at) stays closed, whatever a rule says
 *   (`contact-guard.ts`): only full access opens it. Changing what decides a run (the folder's OpenCode settings,
 *   skills and instructions, or git's own files) is refused, also through a link to them.
 */
export interface OpenCodeFolder {
  project: string;
  /** The folder's own permission rules, as OpenCode has them, in its order. */
  rules: Rule[];
  /** The folder's skills, by name. */
  skills: string[];
  /** The folder's MCP servers, by name. */
  servers: string[];
  /** What keeps Agent Inbox's key from the run. */
  guard: KeyGuard;
}

/** OpenCode's own permissions; any other name is an MCP server's tool, `<server>_<tool>`. */
const BUILT_IN = new Set([
  'read',
  'edit',
  'write',
  'patch',
  'glob',
  'grep',
  'list',
  'bash',
  'shell',
  'task',
  'subagent',
  'skill',
  'lsp',
  'todoread',
  'todowrite',
  'webfetch',
  'websearch',
  'codesearch',
  'external_directory',
  'doom_loop',
  'question',
  'execute',
  'browser',
]);

/** What a contact's run may always do: ask the person, and keep a plan. */
const ALWAYS = ['question', 'todowrite', 'todoread'];

/** Where OpenCode finds a folder's settings, in each folder it looks in. */
const SETTINGS = [
  'opencode.jsonc',
  'opencode.json',
  join('.opencode', 'opencode.jsonc'),
  join('.opencode', 'opencode.json'),
];

/** Where OpenCode finds a folder's skills. */
const SKILL_FOLDERS = [
  join('.opencode', 'skills'),
  join('.opencode', 'skill'),
  join('.claude', 'skills'),
  join('.agents', 'skills'),
];

/** The folder's files that decide what a run does: what edits and commands may not touch. */
const DECIDING_FILES = ['*opencode.json', '*opencode.jsonc', '*.opencode', '*.opencode/*', '*AGENTS.md', '*CLAUDE.md'];
const DECIDING_FOLDERS = ['*.git/*', '*.claude/*', '*.agents/*'];
const DECIDING_WORDS = [
  '*opencode.json*',
  '*.opencode*',
  '*AGENTS.md*',
  '*CLAUDE.md*',
  '*.git/*',
  '*.claude*',
  '*.agents*',
];
const DECIDING_EDITS = [...DECIDING_FILES, ...DECIDING_FOLDERS];
/** The same, by their names in the folder: where one of them leads through a link decides the run too. */
const DECIDING_NAMES = [
  'opencode.json',
  'opencode.jsonc',
  '.opencode',
  'AGENTS.md',
  'CLAUDE.md',
  '.git',
  '.claude',
  '.agents',
];

/**
 * Reads what the folder's own OpenCode settings say. Settings that can't be read count as saying nothing. The key is
 * where the CLI finds it: `configFile` when `INBOX_CONFIG` names one.
 */
export function readOpenCodeFolder(
  project: string,
  major: 1 | 2,
  home: string = homedir(),
  configFile: string | undefined = process.env.INBOX_CONFIG
): OpenCodeFolder {
  const settings = foldersOf(project, home).flatMap((folder) =>
    SETTINGS.map((file) => readJsonc(join(folder, file))).filter(isRecord)
  );
  const servers = settings.flatMap(serversIn);
  const rules = settings.flatMap((each) => rulesIn(each, major)).filter((rule) => counts(rule, servers));

  return {
    project,
    rules,
    skills: [...new Set(foldersOf(project, home).flatMap(skillsIn))],
    servers: [...new Set(servers)],
    guard: keyGuardFor(project, home, configFile),
  };
}

/**
 * The rules a contact's session goes by, in place of the operator's: everything refused, the folder's skills, then
 * the folder's rules (which decide a skill they name), then what always works, and last what no rule of the folder's
 * turns back on: where the key is, what decides a run, Code Mode, and OpenCode 1's subagents (which keep only the
 * session's denies).
 */
export function folderSessionRules(major: 1 | 2, folder: OpenCodeFolder): Rule[] {
  const shell = shellOf(major);
  const deny = (name: string, pattern: string): Rule => ({ name, pattern, effect: 'deny' });
  const keyPatterns = ['*.agentinbox*', ...folder.guard.places.map((place) => `*${place}*`)];

  return [
    deny('*', '*'),
    ...folder.skills.map((name): Rule => ({ name: 'skill', pattern: name, effect: 'allow' })),
    ...folder.rules,
    ...ALWAYS.map((name): Rule => ({ name, pattern: '*', effect: 'allow' })),
    { name: `${CONVERSATION_TOOLS_SERVER}_*`, pattern: '*', effect: 'allow' },
    ...checkedTools(major).flatMap((name) => keyPatterns.map((pattern) => deny(name, pattern))),
    deny(shell, '*INBOX_CONFIG*'),
    ...DECIDING_EDITS.map((pattern) => deny('edit', pattern)),
    ...DECIDING_WORDS.map((pattern) => deny(shell, pattern)),
    deny('execute', '*'),
    ...(major === 1 ? [deny('task', '*')] : []),
  ];
}

/**
 * The rules OpenCode gets for a contact's session (`folderSessionRules`), except that what they allow of the tools
 * that reach files and commands asks instead, so that the listener decides it (`decideOpenCodeCall`).
 */
export function contactSessionRules(major: 1 | 2, folder: OpenCodeFolder): Rule[] {
  const checked = checkedTools(major);

  return folderSessionRules(major, folder).map((rule) =>
    rule.effect === 'allow' && checked.some((name) => fitsPattern(name, rule.name)) ? { ...rule, effect: 'ask' } : rule
  );
}

/** A permission OpenCode asks for in a contact's session, with what its tool was given and what OpenCode said of it. */
export interface OpenCodeCall {
  name: string;
  patterns: string[];
  input: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

/**
 * What the listener answers for a contact's session about a tool that reaches files or commands: what the folder's
 * own rules say (`folderSessionRules`), unless the call could reach the key, writes or names what decides a run
 * through a link (the rules only see the name it is given), or is a command the shell works out for itself that no
 * rule for every command covers. Undefined for other tools, which OpenCode decides by the rules alone.
 */
export function decideOpenCodeCall(
  major: 1 | 2,
  folder: OpenCodeFolder,
  call: OpenCodeCall
): { decision: Decision; why?: string } | undefined {
  if (!checkedTools(major).includes(call.name)) {
    return undefined;
  }

  const isShell = call.name === shellOf(major);
  const command = stringOf(call.input.command) ?? stringOf(call.metadata.command) ?? call.patterns.join(' && ');
  const cwd = resolve(folder.project, stringOf(call.input.workdir) ?? stringOf(call.metadata.workdir) ?? '.');
  const searched = SEARCHES.includes(call.name);
  if (
    isShell
      ? commandReachesKey(command, cwd, folder.guard)
      : pathsOf(call, folder).some((path) => reachesKey(path, folder.guard, searched))
  ) {
    return { decision: 'deny', why: 'it could reach Agent Inbox’s key' };
  }
  if (
    isShell
      ? commandLeadsTo(command, cwd, folder.guard.home, decidesRun(folder, DECIDING_WORDS))
      : WRITES.includes(call.name) && pathsOf(call, folder).some(decidesRun(folder, DECIDING_EDITS))
  ) {
    return { decision: 'deny', why: 'it reaches what decides a run' };
  }

  const rules = folderSessionRules(major, folder);
  const effect = effectOf(rules, call.name, call.patterns);
  if (effect === 'deny') {
    return { decision: 'deny', why: 'the folder’s OpenCode settings don’t allow it' };
  }
  if (!isShell || (chainParts(command)?.every((part) => simpleCommandWords(part) !== null) ?? false)) {
    return { decision: effect };
  }

  // What the shell works out for itself, as for Claude Code: only a rule for every command covers it.
  const every = effectOf(rules, call.name, [EVERY_COMMAND]);

  return every === 'deny'
    ? { decision: 'deny', why: 'only a rule for every command covers what the shell works out for itself' }
    : { decision: every === 'ask' || effect === 'ask' ? 'ask' : 'allow' };
}

/**
 * Whether OpenCode takes `text` as fitting `pattern`, as it matches its rules: `*` stands for anything, `?` for one
 * character, and a pattern that ends with ` *` fits the words before it alone too (`ls *` fits `ls`).
 */
export function fitsPattern(text: string, pattern: string): boolean {
  let source = pattern
    .replace(/\\/g, '/')
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  if (source.endsWith(' .*')) {
    source = `${source.slice(0, -3)}( .*)?`;
  }

  return new RegExp(`^${source}$`, 's').test(text.replace(/\\/g, '/'));
}

/** What rules say about a permission for these patterns, as OpenCode reads them: the last rule that fits each one. */
export function effectOf(rules: readonly Rule[], name: string, patterns: readonly string[]): Rule['effect'] {
  const effects = (patterns.length > 0 ? patterns : ['*']).map((pattern) => {
    for (let at = rules.length - 1; at >= 0; at--) {
      if (fitsPattern(name, rules[at].name) && fitsPattern(pattern, rules[at].pattern)) {
        return rules[at].effect;
      }
    }

    return 'ask';
  });

  return effects.includes('deny') ? 'deny' : effects.includes('ask') ? 'ask' : 'allow';
}

/** A command no rule names: only a rule for every command fits it. */
const EVERY_COMMAND = '\u0000';

/** The tools that search a folder: everything under it counts as read. */
const SEARCHES = ['glob', 'grep', 'list'];

/** The tools that write files. */
const WRITES = ['edit', 'write', 'patch'];

/**
 * A check of whether a path, its links followed, is one of the files that decide a run, as the session's denies name
 * them (`patterns`): what they see is the name a call gives, which a link can hide. Where a link among the folder's
 * own leads counts too, outside the folder as well.
 */
function decidesRun(folder: OpenCodeFolder, patterns: readonly string[]): (path: string) => boolean {
  const project = realPathOf(folder.project);
  const linked = decidingCheck(project, DECIDING_NAMES);

  return (path) => {
    const real = realTarget(path);

    return patterns.some((pattern) => fitsPattern(relative(project, real), pattern)) || linked(real);
  };
}

/** The tools that reach files and commands, which the listener decides for a contact's session. */
function checkedTools(major: 1 | 2): string[] {
  return ['read', 'edit', 'write', 'patch', 'glob', 'grep', 'list', 'lsp', 'external_directory', shellOf(major)];
}

/**
 * The paths a call reaches: what its tool was given and what OpenCode said of it, and the paths it asks for. A search
 * with none given searches the project; a file name pattern that climbs out of it, or starts elsewhere, everything.
 */
function pathsOf(call: OpenCodeCall, folder: OpenCodeFolder): string[] {
  const said = [call.input, call.metadata];
  const given = said.flatMap((each) =>
    ['filePath', 'filepath', 'file_path', 'path', 'parentDir'].flatMap((key) => stringOf(each[key]) ?? [])
  );
  const folders = said.flatMap((each) =>
    Array.isArray(each.directories) ? each.directories.filter((one): one is string => typeof one === 'string') : []
  );
  const asked = SEARCHES.includes(call.name)
    ? []
    : call.patterns.filter((pattern) => pattern !== '*').map((pattern) => pattern.replace(/\/\*$/, ''));
  const pattern = call.name === 'glob' ? (stringOf(call.input.pattern) ?? '') : '';
  const escapes = pattern.startsWith('/') || pattern.startsWith('~') || pattern.includes('..');
  const paths = [...given, ...folders, ...asked, ...(escapes ? [sep] : [])];

  return (paths.length > 0 ? paths : [folder.project]).map((path) =>
    path === '~' || path.startsWith('~/') ? join(folder.guard.home, path.slice(1)) : resolve(folder.project, path)
  );
}

/** The shell's permission as this OpenCode names it. */
function shellOf(major: 1 | 2): string {
  return major === 1 ? 'bash' : 'shell';
}

/**
 * The settings OpenCode takes from its environment (`OPENCODE_CONFIG_CONTENT`) for a contact's run: the run's own
 * conversation tools as a local MCP server, on top of whatever `given` set there already.
 */
export function contactConfigContent(major: 1 | 2, helper: HostProgram, env: NodeJS.ProcessEnv): string {
  const server = {
    type: 'local',
    command: [helper.command, ...helper.args],
    ...(env.INBOX_CONFIG ? { environment: { INBOX_CONFIG: env.INBOX_CONFIG } } : {}),
  };
  let given: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(env.OPENCODE_CONFIG_CONTENT ?? '{}') as unknown;
    given = isRecord(parsed) ? parsed : {};
  } catch {
    // Settings that aren't JSON are OpenCode's to complain about; the run's tools go in all the same.
  }
  const mcp = isRecord(given.mcp) ? given.mcp : {};

  return JSON.stringify({
    ...given,
    mcp:
      major === 1
        ? { ...mcp, [CONVERSATION_TOOLS_SERVER]: { ...server, enabled: true } }
        : {
            ...mcp,
            servers: { ...(isRecord(mcp.servers) ? mcp.servers : {}), [CONVERSATION_TOOLS_SERVER]: server },
          },
  });
}

/**
 * Settings as OpenCode writes them, JSON with comments and trailing commas: an object, or undefined when it isn't
 * one or can't be read.
 */
export function parseJsonc(text: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(withoutTrailingCommas(withoutComments(text))) as Record<string, unknown> | null;

    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/** The text without the commas JSON doesn't take, just before a `}` or `]`; strings left as they are. */
function withoutTrailingCommas(text: string): string {
  let plain = '';
  for (let at = 0; at < text.length; ) {
    const end = text[at] === '"' ? stringEnd(text, at) : at;
    if (end > at) {
      plain += text.slice(at, end);
      at = end;
    } else {
      const trailing = text[at] === ',' && /^\s*[}\]]/.test(text.slice(at + 1));
      plain += trailing ? '' : text[at];
      at += 1;
    }
  }

  return plain;
}

/** The text without its `//` and `/* … *\/` comments, strings left as they are. */
function withoutComments(text: string): string {
  let plain = '';
  for (let at = 0; at < text.length; ) {
    const end = text[at] === '"' ? stringEnd(text, at) : at;
    if (end > at) {
      plain += text.slice(at, end);
      at = end;
    } else if (text.startsWith('//', at)) {
      at = text.includes('\n', at) ? text.indexOf('\n', at) : text.length;
    } else if (text.startsWith('/*', at)) {
      at = text.includes('*/', at + 2) ? text.indexOf('*/', at + 2) + 2 : text.length;
    } else {
      plain += text[at];
      at += 1;
    }
  }

  return plain;
}

/** Where a string that starts at `at` ends, just after its closing quote. */
function stringEnd(text: string, at: number): number {
  for (let index = at + 1; index < text.length; index++) {
    if (text[index] === '\\') {
      index += 1;
    } else if (text[index] === '"') {
      return index + 1;
    }
  }

  return text.length;
}

/**
 * The folders OpenCode looks in for a folder's settings, the furthest up first: the folder, and those above it up
 * to its git root. Never the home folder, whose settings are the operator's own.
 */
function foldersOf(project: string, home: string): string[] {
  const personal = realPathOf(home);
  const folders: string[] = [];
  for (let folder = realPathOf(project); folder !== personal; folder = dirname(folder)) {
    folders.unshift(folder);
    if (existsSync(join(folder, '.git')) || dirname(folder) === folder) {
      break;
    }
  }

  return folders.length > 0 ? folders : [realPathOf(project)];
}

/** A rule only counts when it names a tool, and an MCP server's only when the server is the folder's. */
function counts(rule: Rule, servers: readonly string[]): boolean {
  if (rule.effect === 'deny') {
    return true;
  }
  if (rule.name === '' || rule.name.startsWith('*')) {
    return false;
  }

  return BUILT_IN.has(rule.name) || servers.some((server) => rule.name.startsWith(`${namespace(server)}_`));
}

/** A settings file's permission rules, both ways OpenCode writes them, named as this OpenCode names them. */
function rulesIn(settings: Record<string, unknown>, major: 1 | 2): Rule[] {
  const agents = isRecord(settings.agent) ? settings.agent : {};
  const build = isRecord(agents.build) ? agents.build : {};

  return [settings, build]
    .flatMap((source) => [
      ...permissionRules(source.permission),
      ...listedRules(source.permissions),
      ...Object.entries(isRecord(source.tools) ? source.tools : {}).flatMap(([name, on]) =>
        on === false ? [{ name, pattern: '*', effect: 'deny' as const }] : []
      ),
    ])
    .map((rule) => ({ ...rule, name: shellName(rule.name, major) }));
}

/** `"permission": { "bash": { "git *": "allow" }, "edit": "ask" }`, as OpenCode 1 writes it. */
function permissionRules(permission: unknown): Rule[] {
  if (!isRecord(permission)) {
    return [];
  }

  return Object.entries(permission).flatMap(([name, said]) => {
    if (isEffect(said)) {
      return [{ name, pattern: '*', effect: said }];
    }

    return Object.entries(isRecord(said) ? said : {}).flatMap(([pattern, effect]) =>
      isEffect(effect) ? [{ name, pattern, effect }] : []
    );
  });
}

/** `"permissions": [{ "action": "shell", "resource": "git *", "effect": "allow" }]`, as OpenCode 2 writes it. */
function listedRules(permissions: unknown): Rule[] {
  return (Array.isArray(permissions) ? permissions : []).flatMap((rule) => {
    const name = isRecord(rule) ? stringOf(rule.action) : undefined;
    const pattern = isRecord(rule) ? (stringOf(rule.resource) ?? '*') : '*';
    const effect = isRecord(rule) ? rule.effect : undefined;

    return name && isEffect(effect) ? [{ name, pattern, effect }] : [];
  });
}

/** The MCP servers a settings file names, both ways OpenCode writes them, those switched off left out. */
function serversIn(settings: Record<string, unknown>): string[] {
  const mcp = isRecord(settings.mcp) ? settings.mcp : {};
  const servers = isRecord(mcp.servers) ? mcp.servers : mcp;

  return Object.entries(servers).flatMap(([name, server]) =>
    isRecord(server) && server.enabled !== false && server.disabled !== true && name !== CONVERSATION_TOOLS_SERVER
      ? [name]
      : []
  );
}

/** The skills in a folder's skill folders, by the name each one gives itself, or its folder's. */
function skillsIn(folder: string): string[] {
  return SKILL_FOLDERS.flatMap((place) => {
    const skills = join(folder, place);
    try {
      return readdirSync(skills, { withFileTypes: true }).flatMap((entry) => {
        const file = join(skills, entry.name, 'SKILL.md');
        if (!entry.isDirectory() || !existsSync(file)) {
          return [];
        }
        const named = /^---[\s\S]*?^name:\s*["']?([^"'\n]+?)["']?\s*$/m.exec(readFileSync(file, 'utf8'))?.[1];

        return [named ?? entry.name];
      });
    } catch {
      return [];
    }
  });
}

/** The shell's permission as this OpenCode names it: `bash` for OpenCode 1, `shell` for OpenCode 2. */
function shellName(name: string, major: 1 | 2): string {
  return name === 'bash' || name === 'shell' ? (major === 1 ? 'bash' : 'shell') : name;
}

/** How OpenCode names an MCP server in its tools' names. */
function namespace(server: string): string {
  return server.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function isEffect(value: unknown): value is Rule['effect'] {
  return value === 'allow' || value === 'ask' || value === 'deny';
}

function readJsonc(path: string): Record<string, unknown> | undefined {
  try {
    return parseJsonc(readFileSync(path, 'utf8'));
  } catch {
    return undefined;
  }
}
