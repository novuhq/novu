import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve, sep } from 'node:path';
import {
  chainParts,
  commandLeadsTo,
  commandNames,
  commandReachesKey,
  type Decision,
  decidingCheck,
  type KeyGuard,
  keyGuardFor,
  reachesKey,
  realTarget,
} from './contact-guard';
import { CONVERSATION_TOOLS_SERVER } from './conversation-tools';
import { isRecord, stringOf } from './host-program';
import { realPathOf, simpleCommandWords } from './own-replies';

/**
 * What a contact's run may do in Claude Code: what the folder's own settings allow, and nothing else.
 *
 * - Only `.claude/settings.json` counts, the folder's shared settings: not `.claude/settings.local.json`, where
 *   Claude Code keeps the operator's own "don't ask again" answers, and not the operator's settings in `~/.claude`.
 * - A rule that allows runs, one that asks sends the operator a card, and a deny, or no rule at all, refuses, with no
 *   card. Claude Code's own defaults don't count: it reads files and runs some commands without any rule, and for a
 *   contact a missing rule means no.
 * - The run's own conversation tools (`conversation-tools.ts`) always work, and so does asking the person in the
 *   conversation a question.
 * - Agent Inbox's key (`~/.agentinbox`, or the file `INBOX_CONFIG` points at) stays closed, whatever a rule says
 *   (`contact-guard.ts`): only full access opens it.
 * - Editing what decides a run (the folder's settings, MCP servers, skills and instructions, or git's own files)
 *   always asks the operator, whatever allows it: otherwise a contact could give their next run more.
 */
export type { Decision } from './contact-guard';

/** A permission rule as Claude Code writes one: `Tool`, or `Tool(specifier)`. */
export interface ClaudeRule {
  tool: string;
  specifier?: string;
}

export interface ClaudeFolder {
  project: string;
  allow: ClaudeRule[];
  ask: ClaudeRule[];
  deny: ClaudeRule[];
  /** The skills in the folder's `.claude/skills`, by name. */
  skills: string[];
  /** The folder's `.mcp.json` servers that a rule names, as `.mcp.json` has them. */
  mcpServers: Record<string, unknown>;
  /** What keeps Agent Inbox's key from the run. */
  guard: KeyGuard;
}

/** The built-in tools a rule for this tool covers: a `Read` rule is for every tool that reads files, and so on. */
const RULE_TOOLS: Record<string, readonly string[]> = {
  Read: ['Read', 'Glob', 'Grep', 'LS', 'NotebookRead'],
  Edit: ['Edit', 'Write', 'MultiEdit', 'NotebookEdit'],
  Write: ['Edit', 'Write', 'MultiEdit', 'NotebookEdit'],
};

const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);
const READ_TOOLS = new Set(RULE_TOOLS.Read);
const EDIT_TOOLS = new Set(RULE_TOOLS.Edit);

/** Tools a contact's run always has: asking the person in the conversation is part of talking to them. */
const ALWAYS = ['AskUserQuestion'];

/** The folder's files that decide what a run does: changing them takes the operator. */
const DECIDING = ['.claude', '.mcp.json', 'CLAUDE.md', 'CLAUDE.local.md', 'AGENTS.md', '.git'];

/**
 * Reads what the folder's own settings say. Settings that can't be read count as saying nothing. The key is where the
 * CLI finds it: `configFile` when `INBOX_CONFIG` names one.
 */
export function readClaudeFolder(
  project: string,
  home: string = homedir(),
  configFile: string | undefined = process.env.INBOX_CONFIG
): ClaudeFolder {
  const settings = readJson(join(project, '.claude', 'settings.json'));
  const permissions = isRecord(settings?.permissions) ? settings.permissions : {};
  const rules = (key: string) =>
    (Array.isArray(permissions[key]) ? permissions[key] : [])
      .filter((rule): rule is string => typeof rule === 'string')
      .map(parseRule)
      .filter((rule): rule is ClaudeRule => rule !== undefined);
  const allow = rules('allow');
  const ask = rules('ask');
  const deny = rules('deny');

  const named = new Set(
    [...allow, ...ask].filter((rule) => rule.tool.startsWith('mcp__')).map((rule) => rule.tool.split('__')[1])
  );
  const disabled = new Set(
    Array.isArray(settings?.disabledMcpjsonServers) ? settings.disabledMcpjsonServers.filter(isString) : []
  );
  const mcpJson = readJson(join(project, '.mcp.json'));
  const servers = isRecord(mcpJson?.mcpServers) ? mcpJson.mcpServers : {};

  return {
    project,
    allow,
    ask,
    deny,
    skills: skillsIn(join(project, '.claude', 'skills')),
    mcpServers: Object.fromEntries(
      Object.entries(servers).filter(
        ([name]) => named.has(name) && !disabled.has(name) && name !== CONVERSATION_TOOLS_SERVER
      )
    ),
    guard: keyGuardFor(project, home, configFile),
  };
}

/** `Bash(npm test)` → `{ tool: 'Bash', specifier: 'npm test' }`; `WebSearch` → `{ tool: 'WebSearch' }`. */
export function parseRule(text: string): ClaudeRule | undefined {
  const trimmed = text.trim();
  const open = trimmed.indexOf('(');
  if (open < 0) {
    return trimmed ? { tool: trimmed } : undefined;
  }
  if (!trimmed.endsWith(')')) {
    return undefined;
  }

  const tool = trimmed.slice(0, open).trim();
  const specifier = trimmed.slice(open + 1, -1).trim();

  return tool ? { tool, ...(specifier && specifier !== '*' ? { specifier } : {}) } : undefined;
}

/**
 * The built-in tools a contact's run starts with (`--tools`): the ones a rule allows or asks for, skills when the
 * folder has some, and asking the person. Nothing else is there to reach for; what is, the check still decides.
 */
export function claudeToolsFor(folder: ClaudeFolder): string[] {
  const tools = new Set<string>(ALWAYS);
  for (const rule of [...folder.allow, ...folder.ask]) {
    if (rule.tool.startsWith('mcp__')) {
      continue;
    }
    for (const tool of RULE_TOOLS[rule.tool] ?? [rule.tool]) {
      tools.add(tool);
    }
  }
  if (folder.skills.length > 0) {
    tools.add('Skill');
  }

  return [...tools];
}

/**
 * What a contact's run may do about one tool call, by the folder's own rules. A command runs where Claude Code's
 * shell is (`cwd`), the project unless it says another.
 */
export function decideForContact(
  folder: ClaudeFolder,
  tool: string,
  input: Record<string, unknown>,
  cwd?: string
): Decision {
  if (isConversationTool(tool) || ALWAYS.includes(tool)) {
    return 'allow';
  }

  const place = { project: realPathOf(folder.project), home: folder.guard.home };

  if (SHELL_TOOLS.has(tool)) {
    return decideCommand(folder, tool, stringOf(input.command) ?? '', place, cwd ?? place.project);
  }

  const target = targetOf(tool, input, place);
  if (touchesKey(target, folder.guard)) {
    return 'deny';
  }

  const covers = (rule: ClaudeRule) => covered(rule, tool, input, target, place);

  if (folder.deny.some(covers)) {
    return 'deny';
  }

  const decision: Decision = folder.ask.some(covers)
    ? 'ask'
    : folder.allow.some(covers)
      ? 'allow'
      : tool === 'Skill' && folder.skills.includes(skillName(input))
        ? 'allow'
        : 'deny';

  // Changing what decides the next run is the operator's, whatever allows it.
  return decision === 'allow' && EDIT_TOOLS.has(tool) && target.paths.some(decidingCheck(place.project, DECIDING))
    ? 'ask'
    : decision;
}

/** Whether a tool is one of the run's own conversation tools, as Claude Code names an MCP server's tools. */
export function isConversationTool(tool: string): boolean {
  return tool.startsWith(`mcp__${CONVERSATION_TOOLS_SERVER}__`);
}

type Place = { project: string; home: string };

/** A command's rules of one kind, for the tool that runs it. */
interface CommandRules {
  deny: ClaudeRule[];
  ask: ClaudeRule[];
  allow: ClaudeRule[];
}

/** One plain command of a chain: as written, and its words as the shell reads them. */
interface PlainPart {
  raw: string;
  words: string;
}

/**
 * A command, part by part: a chain joined by `&&` is decided by its parts, and the chain asks when one part asks.
 * Anything the shell would work out for itself (pipes, `;`, redirections, variables, file name patterns, command
 * substitution) only a rule for every command covers: what it would run can't be told from its words. A command
 * that could reach the key is refused, and changing what decides a run asks.
 */
function decideCommand(folder: ClaudeFolder, tool: string, command: string, place: Place, cwd: string): Decision {
  const runsIn = expand(cwd, place);
  if (commandReachesKey(command, runsIn, folder.guard)) {
    return 'deny';
  }

  const ofTool = (rules: ClaudeRule[]) => rules.filter((rule) => rule.tool === tool);
  const rules = { deny: ofTool(folder.deny), ask: ofTool(folder.ask), allow: ofTool(folder.allow) };
  const parts = plainParts(command);
  const decision = parts ? decidePlain(rules, parts) : decideShellWork(rules, command);

  return decision === 'allow' && commandTouchesDeciding(command, runsIn, place) ? 'ask' : decision;
}

/** The plain commands of a chain joined by `&&`, or undefined when it is anything more. */
function plainParts(command: string): PlainPart[] | undefined {
  const parts: PlainPart[] = [];
  for (const part of chainParts(command) ?? []) {
    const words = simpleCommandWords(part);
    if (!words) {
      return undefined;
    }
    parts.push({ raw: part.trim(), words: words.join(' ') });
  }

  return parts.length > 0 ? parts : undefined;
}

function decidePlain(rules: CommandRules, parts: PlainPart[]): Decision {
  const covers = (rule: ClaudeRule, part: PlainPart) =>
    rule.specifier === undefined ||
    matchesCommand(rule.specifier, part.words) ||
    matchesCommand(rule.specifier, part.raw);

  let decision: Decision = 'allow';
  for (const part of parts) {
    if (rules.deny.some((rule) => covers(rule, part))) {
      return 'deny';
    }
    if (rules.ask.some((rule) => covers(rule, part))) {
      decision = 'ask';
    } else if (!rules.allow.some((rule) => covers(rule, part))) {
      return 'deny';
    }
  }

  return decision;
}

/** A command the shell works out for itself: denies are read generously, and only a rule for every command covers it. */
function decideShellWork(rules: CommandRules, command: string): Decision {
  const raw = command.trim();
  const pieces = [raw, ...raw.split(/&&|\|\||[;&|\n]/).map((piece) => piece.trim())].filter(Boolean);
  const denied = rules.deny.some(
    (rule) => rule.specifier === undefined || pieces.some((piece) => matchesCommand(rule.specifier ?? '', piece))
  );
  // What it builds can't be read, so with denies there is no telling it misses them.
  if (denied || (rules.deny.length > 0 && /`|\$\(/.test(raw))) {
    return 'deny';
  }
  if (rules.ask.some((rule) => rule.specifier === undefined)) {
    return 'ask';
  }

  return rules.allow.some((rule) => rule.specifier === undefined) ? 'allow' : 'deny';
}

/**
 * A rule's command against a command, as Claude Code matches them: `npm run test:*` for the command and anything
 * after it, `*` anywhere for any words there, otherwise the whole command.
 */
export function matchesCommand(specifier: string, command: string): boolean {
  if (specifier.endsWith(':*')) {
    const prefix = specifier.slice(0, -2);

    return command === prefix || command.startsWith(`${prefix} `);
  }
  if (specifier.includes('*')) {
    const pattern = specifier
      .split('*')
      .map((piece) => piece.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*');

    return new RegExp(`^${pattern}$`, 's').test(command);
  }

  return command === specifier;
}

/** What a tool call reaches: the files it reads or edits, a web host, or nothing to check. */
interface Target {
  paths: string[];
  host?: string;
  /** A search through a folder: everything under it counts as read. */
  searches?: boolean;
}

function targetOf(tool: string, input: Record<string, unknown>, place: Place): Target {
  if (READ_TOOLS.has(tool) || EDIT_TOOLS.has(tool)) {
    const given = stringOf(input.file_path) ?? stringOf(input.notebook_path) ?? stringOf(input.path);
    const searches = tool === 'Glob' || tool === 'Grep' || tool === 'LS';
    const pattern = stringOf(input.pattern) ?? '';
    // A pattern that climbs out of the folder searched, or starts elsewhere, reaches whatever it names.
    const escapes = tool === 'Glob' && (isAbsolute(pattern) || pattern.startsWith('~') || pattern.includes('..'));

    return {
      paths: escapes ? [sep] : [realTarget(expand(given ?? (searches ? '.' : ''), place))],
      searches,
    };
  }

  if (tool === 'WebFetch') {
    try {
      return { paths: [], host: new URL(stringOf(input.url) ?? '').hostname.toLowerCase() };
    } catch {
      return { paths: [] };
    }
  }

  return { paths: [] };
}

function covered(
  rule: ClaudeRule,
  tool: string,
  input: Record<string, unknown>,
  target: Target,
  place: Place
): boolean {
  if (tool.startsWith('mcp__') || rule.tool.startsWith('mcp__')) {
    return mcpCovered(rule.tool, tool);
  }
  if (!(RULE_TOOLS[rule.tool] ?? [rule.tool]).includes(tool)) {
    return false;
  }
  if (rule.specifier === undefined) {
    return true;
  }

  if (READ_TOOLS.has(tool) || EDIT_TOOLS.has(tool)) {
    const pattern = pathPattern(rule.specifier, place);

    return target.paths.length > 0 && target.paths.every((path) => pattern.test(path));
  }
  if (tool === 'WebFetch') {
    const domain = /^domain:(.+)$/.exec(rule.specifier)?.[1]?.toLowerCase();
    if (!domain || !target.host) {
      return false;
    }

    return domain.startsWith('*.') ? target.host.endsWith(domain.slice(1)) : target.host === domain;
  }
  if (tool === 'Skill') {
    return rule.specifier === skillName(input);
  }
  if (tool === 'Task' || tool === 'Agent') {
    return rule.specifier === stringOf(input.subagent_type);
  }

  // A specifier this check doesn't know covers nothing: no rule then, so no.
  return false;
}

/** `mcp__server` and `mcp__server__*` cover all of a server's tools, `mcp__server__tool` that one. */
function mcpCovered(rule: string, tool: string): boolean {
  if (!rule.startsWith('mcp__') || !tool.startsWith('mcp__')) {
    return false;
  }
  const [, ruleServer, ruleTool] = rule.split('__');
  const [, server] = tool.split('__');
  if (ruleServer !== server) {
    return false;
  }

  return ruleTool === undefined || ruleTool === '*' || rule === tool;
}

/**
 * A path rule as Claude Code reads it, gitignore-style: `//abs/path`, `~/in/home`, `/from/the/project`, or
 * `./from/the/project`. `*` stays within a folder, `**` goes through folders, and a path without either covers
 * what is under it too.
 */
export function pathPattern(specifier: string, place: Place): RegExp {
  const path = rulePath(specifier, place);

  return new RegExp(`^${globPattern(path)}${/[*?]/.test(path) ? '' : '(?:/.*)?'}$`, 's');
}

/** Where a path rule points, its patterns kept. */
function rulePath(specifier: string, place: Place): string {
  if (specifier.startsWith('//')) {
    return specifier.slice(1);
  }
  if (specifier === '~' || specifier.startsWith('~/')) {
    return join(place.home, specifier.slice(1));
  }
  if (specifier.startsWith('/')) {
    return join(place.project, specifier);
  }

  return resolve(place.project, specifier);
}

/** A path with `*`, `**` and `?` as a regular expression's source. */
function globPattern(path: string): string {
  let pattern = '';
  for (let at = 0; at < path.length; at++) {
    const char = path[at];
    if (char === '*' && path[at + 1] === '*') {
      const folders = path[at + 2] === '/';
      pattern += folders ? '(?:.*/)?' : '.*';
      at += folders ? 2 : 1;
    } else if (char === '*' || char === '?') {
      pattern += char === '*' ? '[^/]*' : '[^/]';
    } else {
      pattern += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }

  return pattern;
}

/** Whether a call reaches the key: a file where it is, or a search of a folder that holds it or a link to it. */
function touchesKey(target: Target, guard: KeyGuard): boolean {
  return target.paths.some((path) => reachesKey(path, guard, Boolean(target.searches)));
}

/**
 * Whether a command names one of the folder's files that decide what a run does: by its words, or by a path that
 * leads there through a link, from where it runs (`cwd`), or that a link among them leads to.
 */
function commandTouchesDeciding(command: string, cwd: string, place: Place): boolean {
  return (
    commandNames(command, DECIDING) || commandLeadsTo(command, cwd, place.home, decidingCheck(place.project, DECIDING))
  );
}

function expand(path: string, place: Place): string {
  if (path === '~' || path.startsWith('~/')) {
    return join(place.home, path.slice(1));
  }

  return resolve(place.project, path);
}

function skillsIn(folder: string): string[] {
  try {
    return readdirSync(folder, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(join(folder, entry.name, 'SKILL.md')))
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

function skillName(input: Record<string, unknown>): string {
  return (stringOf(input.skill) ?? stringOf(input.command) ?? '').replace(/^\//, '');
}

/** A JSON file as an object, or undefined when it isn't one or can't be read. */
function readJson(path: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown> | null;

    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}
