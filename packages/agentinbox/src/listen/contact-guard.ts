import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readdirSync, type Stats } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { ListenMessage } from '../api/listen';
import { realPathOf, simpleCommandWords } from './own-replies';

/**
 * A contact's run: a run for a conversation with a contact, not the operator's own direct chat with the agent. It
 * may do only what the folder's own settings allow, never what the operator's own settings do: each host's rules
 * are in `claude-folder.ts`, `codex-folder.ts` and `opencode-folder.ts`, and what they share is here. It reads and
 * resolves its own conversation with its own tools (`conversation-tools.ts`).
 */

/**
 * Whom a run answers to:
 * - `operator`: the operator's own direct chat. The host follows the operator's settings and asks the operator.
 * - `contact`: a contact's run, which may do only what the folder's own settings allow.
 * - `fullAccess`: the run of a contact the operator gave full access. It gets everything the operator's runs get,
 *   and the host asks that contact, in their own chat, not the operator, before doing what needs an OK.
 */
export type RunLevel = 'operator' | 'contact' | 'fullAccess';

/**
 * The level of a run, from the messages it carries besides answers to the agent's own questions:
 * - the operator's when all of them are the operator's, in their direct chat, and its session was never a contact's;
 * - full access when all of them come, in a direct chat, from one contact with full access, as their switch is now;
 * - a contact's otherwise: a contact's or a group's message, or a session that was a contact's.
 *
 * Answers come back to the conversation that asked, the operator's too, so a run of answers alone keeps what its
 * session was (`session`), and is a contact's when that isn't known. Full access holds only while every message, an
 * answer too, still comes with it: the switch may have been turned off since.
 */
export function runLevel(messages: readonly ListenMessage[], session?: RunLevel): RunLevel {
  const written = messages.filter((message) => !message.answersMessageId);
  if (written.length === 0) {
    if (session === 'fullAccess') {
      return byOneWithFullAccess(messages) ? 'fullAccess' : 'contact';
    }

    return session ?? 'contact';
  }

  if (byOneWithFullAccess(messages)) {
    return 'fullAccess';
  }

  const operatorsOwn = written.every((message) => message.from.isOperator && message.isDirectMessage !== false);

  return operatorsOwn && (session === undefined || session === 'operator') ? 'operator' : 'contact';
}

/** Whether every message comes from one contact with full access, each in their direct chat. */
function byOneWithFullAccess(messages: readonly ListenMessage[]): boolean {
  const [first] = messages;

  return (
    first !== undefined &&
    messages.every(
      (message) =>
        message.from.fullAccess === true &&
        !message.from.isOperator &&
        message.isDirectMessage !== false &&
        message.from.id === first.from.id
    )
  );
}

/** What a contact's run may do about a tool call: run it, ask the operator, or refuse it with no card. */
export type Decision = 'allow' | 'ask' | 'deny';

/** The commands of a chain joined by `&&`, or undefined when anything else joins them. */
export function chainParts(command: string): string[] | undefined {
  const parts: string[] = [];
  let quote: string | undefined;
  let start = 0;
  for (let at = 0; at < command.length; at++) {
    const char = command[at];
    if (quote) {
      if (char === quote) {
        quote = undefined;
      } else if (char === '\\' && quote === '"') {
        at += 1;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
    } else if (char === '\\') {
      at += 1;
    } else if (command.startsWith('&&', at)) {
      parts.push(command.slice(start, at));
      start = at + 2;
      at += 1;
    }
  }
  if (quote) {
    return undefined;
  }
  parts.push(command.slice(start));

  return parts.every((part) => part.trim()) ? parts : undefined;
}

/** Where the CLI keeps its key, as a run would reach it. */
export function keyFolder(home: string): string {
  return realTarget(join(home, '.agentinbox'));
}

/**
 * What keeps Agent Inbox's key from a contact's run. No rule of the folder's opens it, whatever the rule names: only
 * full access does, which gets everything the operator's runs get.
 */
export interface KeyGuard {
  /** The home folder, its links followed: where `~` points. */
  home: string;
  /** Where the key is, links followed: the CLI's folder, and the file `INBOX_CONFIG` points the CLI at. */
  places: string[];
  /** Where the folder's links that lead to the key, or to a folder that holds it, are, as git keeps them. */
  links: string[];
}

/** What keeps the key from a contact's run in a folder, with the key where the CLI finds it (`configFile`). */
export function keyGuardFor(project: string, home: string, configFile?: string): KeyGuard {
  const places = [...new Set([keyFolder(home), ...(configFile ? [realTarget(resolve(configFile))] : [])])];

  return { home: realPathOf(home), places, links: keyLinksIn(project, places) };
}

/**
 * The links git keeps in the folder that lead to the key, or to a folder that holds it: through one, a path that never
 * names the key reaches it. A run's own links, and those git doesn't keep, are only caught when a command names them.
 */
export function keyLinksIn(project: string, places: readonly string[]): string[] {
  let listed: string;
  try {
    listed = execFileSync('git', ['-C', project, 'ls-files', '--stage', '-z'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 512 * 1024 * 1024,
      timeout: 30_000,
    });
  } catch {
    // Not a git repository, or no git: no links it keeps.
    return [];
  }

  const base = realPathOf(project);

  return listed.split('\0').flatMap((entry) => {
    const tab = entry.indexOf('\t');
    if (!entry.startsWith('120000 ') || tab < 0) {
      return [];
    }
    const link = join(base, entry.slice(tab + 1));
    const target = realTarget(link);

    return places.some((place) => within(target, place) || within(place, target)) ? [link] : [];
  });
}

/**
 * Whether a path, its links followed, reaches the key: where it is, or in its folder. A search (`searched`) also
 * reaches it from a folder that holds it, or holds one of the folder's links to it.
 */
export function reachesKey(path: string, guard: KeyGuard, searched = false): boolean {
  const real = realTarget(path);

  return (
    guard.places.some((place) => within(real, place) || (searched && within(place, real))) ||
    (searched && guard.links.some((link) => within(link, real)))
  );
}

/**
 * Whether a command could reach the key. By its words: the key's name, the variable that points the CLI elsewhere, a
 * path to where the key is, or a file name pattern among hidden folders, where `~/.agent*` would find it. By the paths
 * it names (`cwd` for where it runs), their links followed: one that leads to the key, or to a folder that holds it.
 * And by where it runs: in a folder that holds the key, or one of the folder's links to it, any command could reach it
 * without naming it (`grep -r`). Each command of a chain runs where a `cd` before it left the shell; a change of folder
 * this can't follow (`cd -`, `pushd`, `popd`) counts as reaching it. Words only: a rule that runs any code it is given
 * reaches anything, which the docs say.
 */
export function commandReachesKey(command: string, cwd: string, guard: KeyGuard): boolean {
  const unquoted = command.replace(/["'\\]/g, '');
  if (
    /\.agentinbox\b/i.test(unquoted) ||
    /\bINBOX_CONFIG\b/.test(unquoted) ||
    guard.places.some((place) => unquoted.includes(place)) ||
    /(^|[\s=:/])\.[^\s/]*[*?[{$]/.test(unquoted)
  ) {
    return true;
  }

  const parts = chainParts(command) ?? [command];
  const folders = chainFolders(parts, cwd, guard.home);

  return (
    folders === undefined ||
    parts.some(
      (part, at) =>
        reachesKey(folders[at], guard, true) ||
        namesPathTo(simpleCommandWords(part) ?? [], folders[at], guard.home, (path) => reachesKey(path, guard, true))
    )
  );
}

/**
 * Whether a plain chain names a path that passes `test`, its links followed, each command's from where it runs
 * (`chainFolders`). A change of folder this can't follow counts as one that passes. Words only, as for the key.
 */
export function commandLeadsTo(command: string, cwd: string, home: string, test: (path: string) => boolean): boolean {
  const parts = chainParts(command) ?? [command];
  const folders = chainFolders(parts, cwd, home);

  return (
    folders === undefined ||
    parts.some((part, at) => namesPathTo(simpleCommandWords(part) ?? [], folders[at], home, test))
  );
}

/**
 * The folder each command of a chain runs in: where a `cd` before it left the shell, from `cwd`. Undefined when one
 * changes folders in a way this can't follow (`cd -`, `pushd`, `popd`).
 */
export function chainFolders(parts: readonly string[], cwd: string, home: string): string[] | undefined {
  const folders: string[] = [];
  let here = cwd;
  for (const part of parts) {
    folders.push(here);
    const words = simpleCommandWords(part) ?? [];
    if (['cd', 'pushd', 'popd'].includes(words[0])) {
      const next = folderAfterCd(words, home, here);
      if (next === undefined) {
        return undefined;
      }
      here = next;
    }
  }

  return folders;
}

/** Whether one command's words name a path that, from `cwd` and with its links followed, passes `test`. */
export function namesPathTo(
  words: readonly string[],
  cwd: string,
  home: string,
  test: (path: string) => boolean
): boolean {
  return words.some((word) => pathsIn(word).some((path) => test(realTarget(expandPath(path, home, cwd)))));
}

/** Where `cd` leaves the shell: the home folder without a folder named. Undefined where this can't tell. */
function folderAfterCd(words: string[], home: string, cwd: string): string | undefined {
  if (words[0] !== 'cd' || words.length > 2 || words[1]?.startsWith('-')) {
    return undefined;
  }

  return words[1] === undefined ? home : expandPath(words[1], home, cwd);
}

/** What of a word could be a path: the word, and what follows `=` in `--file=<path>` or `NAME=<path>`. */
function pathsIn(word: string): string[] {
  const equals = word.indexOf('=');

  return [word, ...(equals >= 0 ? [word.slice(equals + 1)] : [])].filter(Boolean);
}

/** A path as the shell finds it: from the home folder for `~`, else from where it runs. */
function expandPath(path: string, home: string, cwd: string): string {
  return path === '~' || path.startsWith('~/') ? join(home, path.slice(1)) : resolve(cwd, path);
}

/** Whether a command names one of these files or folders, as a word or a path's step. Words only. */
export function commandNames(command: string, names: readonly string[]): boolean {
  const unquoted = command.replace(/["'\\]/g, '');

  return names.some((name) =>
    new RegExp(`(^|[\\s=:/])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[\\s/])`).test(unquoted)
  );
}

/** Whether a path is one of these files or folders of the project, or in one of them. */
export function pathIn(path: string, project: string, names: readonly string[]): boolean {
  const inProject = relative(project, path);
  if (inProject.startsWith('..') || isAbsolute(inProject)) {
    return false;
  }

  return names.some((name) => inProject === name || inProject.startsWith(`${name}${sep}`));
}

/**
 * A check of whether a path, its links followed, is among these files and folders of the project (`project`, its
 * links followed) that decide what a run does (`names`): in one of them, or where a link among them, or inside them,
 * leads, outside the project too. A run reads them through the link, so changing what it leads to is changing them.
 * The links are looked for once, when the check is made.
 */
export function decidingCheck(project: string, names: readonly string[]): (path: string) => boolean {
  const linked = linkTargets(project, names);

  return (path) => pathIn(path, project, names) || linked.some((target) => within(path, target));
}

/** The most entries looked at for links: what decides a run, its settings, skills and git's own files, is far less. */
const MOST_LOOKED = 1000;

/** Folders that only keep what git or a host stores, which a run doesn't read to decide what it does. */
const STORES = new Set(['objects', 'refs', 'logs', 'lfs', 'modules', 'worktrees', 'rr-cache', 'node_modules']);

/**
 * Where the links among these files and folders of the project lead, theirs and those inside them, nearest first:
 * a link isn't followed further, and what only stores things isn't looked through.
 */
function linkTargets(project: string, names: readonly string[]): string[] {
  const targets: string[] = [];
  const queue = names.map((name) => join(project, name));
  for (let at = 0; at < queue.length && at < MOST_LOOKED; at++) {
    const entry = lstatOf(queue[at]);
    if (entry?.isSymbolicLink()) {
      targets.push(realTarget(queue[at]));
    } else if (entry?.isDirectory()) {
      for (const child of childrenOf(queue[at])) {
        if (!STORES.has(child) && queue.length < MOST_LOOKED) {
          queue.push(join(queue[at], child));
        }
      }
    }
  }

  return targets;
}

function lstatOf(path: string): Stats | undefined {
  try {
    return lstatSync(path);
  } catch {
    return undefined;
  }
}

function childrenOf(folder: string): string[] {
  try {
    return readdirSync(folder);
  } catch {
    return [];
  }
}

/** The path with its links followed, through the nearest folder of it that exists when it doesn't yet. */
export function realTarget(path: string): string {
  if (existsSync(path)) {
    return realPathOf(path);
  }
  const parent = dirname(path);
  if (parent === path) {
    return path;
  }

  return join(realTarget(parent), path.slice(parent.length + (parent.endsWith(sep) ? 0 : 1)));
}

/** Whether a path is the folder or in it. */
export function within(path: string, folder: string): boolean {
  const inside = relative(folder, path);

  return inside === '' || (!inside.startsWith('..') && !isAbsolute(inside));
}
