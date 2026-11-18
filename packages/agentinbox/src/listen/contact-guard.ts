import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';
import type { ListenMessage } from '../api/listen';
import { realPathOf } from './own-replies';

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
 * session was (`session`), and is a contact's when that isn't known. A full-access session's answers keep it only while
 * they still come from a contact with full access: the switch may have been turned off since.
 */
export function runLevel(messages: readonly ListenMessage[], session?: RunLevel): RunLevel {
  const written = messages.filter((message) => !message.answersMessageId);
  if (written.length === 0) {
    if (session === 'fullAccess') {
      return byOneWithFullAccess(messages) ? 'fullAccess' : 'contact';
    }

    return session ?? 'contact';
  }

  if (byOneWithFullAccess(written)) {
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
  return realPathOf(join(home, '.agentinbox'));
}

/**
 * Whether a command could reach the key: by name, by the variable that points the CLI elsewhere, or by a file name
 * pattern among the home folder's hidden folders, where `~/.agent*` would find it. Words only: a rule that runs
 * any code it is given reaches anything, which the docs say.
 */
export function commandTouchesKey(command: string, home: string): boolean {
  const unquoted = command.replace(/["'\\]/g, '');

  return (
    /\.agentinbox\b/i.test(unquoted) ||
    /\bINBOX_CONFIG\b/.test(unquoted) ||
    unquoted.includes(keyFolder(home)) ||
    /(^|[\s=:/])\.[^\s/]*[*?[{$]/.test(unquoted)
  );
}

/** Whether words of a rule name the key's folder, so it may open it. */
export function namesKey(text: string): boolean {
  return /\.agentinbox\b/i.test(text) || /\bINBOX_CONFIG\b/.test(text);
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
