import type { PermissionQuestion } from './host-adapter';

/**
 * The woken agent answers people with the CLI (`inbox reply <conversation> …`), or with our MCP server's tools
 * when its host has them, and its host asks before running either. Those questions aren't for the operator:
 * wake allows them by itself, but only the agent's reading and replying in the very conversation that woke it,
 * as plain commands (one, or several joined with `&&`) or one tool call. Anything else, writing to someone new
 * included, still asks the operator.
 */

/** What the agent may do in its own conversation without asking: read it, answer in it, close it. */
const OWN_ACTIONS = new Set(['show', 'reply', 'read', 'resolve']);

/** The same, as our MCP server's tools: `inbox_show`, `inbox_reply`, `inbox_read`, `inbox_resolve`. */
const OWN_TOOLS = new Set([...OWN_ACTIONS].map((action) => `inbox_${action}`));

/** Whether the host asks for the agent's own reading or answering in `conversationId`, and nothing more. */
export function isOwnReplySubject(subject: PermissionQuestion['subject'], conversationId: string): boolean {
  switch (subject.kind) {
    case 'command':
      return isOwnReply(subject.command, conversationId);
    case 'mcp':
      return (
        isOurMcpServer(subject.server) && OWN_TOOLS.has(subject.tool) && subject.input.conversation === conversationId
      );
    default:
      return false;
  }
}

/**
 * Our MCP server, by the names hosts give it: `inbox` (`claude mcp add … inbox`, the name our docs use), the
 * agentinbox plugin's `plugin_agentinbox_inbox`, and a claude.ai connector named after Agent Inbox
 * (`claude_ai_Agent_Inbox`).
 */
export function isOurMcpServer(server: string): boolean {
  const name = server
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/^(claudeai|plugin)/, '');

  return name === 'inbox' || name.startsWith('agentinbox');
}

/** How the CLI is started: `npx @agentinbox/cli`, `npx -y @agentinbox/cli@latest`, or an install's `agentinbox`. */
function cliLength(words: readonly string[]): number {
  if (words[0] === 'agentinbox') {
    return 1;
  }

  if (words[0] !== 'npx') {
    return 0;
  }

  let at = 1;
  while (words[at] === '-y' || words[at] === '--yes') {
    at += 1;
  }

  return /^@agentinbox\/cli(@[\w.-]+)?$/.test(words[at] ?? '') ? at + 1 : 0;
}

/**
 * Whether `command` is the agent reading or answering in `conversationId`, and nothing more: one plain command,
 * or several joined with `&&`, as Claude Code often writes a reply and its resolve.
 */
export function isOwnReply(command: string, conversationId: string): boolean {
  return andParts(command)?.every((part) => ownAction(part, conversationId) !== undefined) ?? false;
}

/**
 * Whether the host is about to answer in `conversationId`: `inbox reply` there, as a command or our MCP server's
 * tool. The chat gets the answer then, not "typing…" after it.
 */
export function repliesIn(subject: PermissionQuestion['subject'], conversationId: string): boolean {
  switch (subject.kind) {
    case 'command':
      return andParts(subject.command)?.some((part) => ownAction(part, conversationId) === 'reply') ?? false;
    case 'mcp':
      return (
        isOurMcpServer(subject.server) &&
        subject.tool === 'inbox_reply' &&
        subject.input.conversation === conversationId
      );
    default:
      return false;
  }
}

/**
 * The commands of a chain, split where `&&` stands outside quotes; null when anything else joins or follows
 * them. Each part still has to be one plain command.
 */
function andParts(command: string): string[] | null {
  const parts: string[] = [];
  let start = 0;
  let at = 0;

  while (at < command.length) {
    if (command.startsWith('&&', at)) {
      parts.push(command.slice(start, at));
      at += 2;
      start = at;
      continue;
    }

    if (command[at] === ' ' || command[at] === '\t') {
      at += 1;
      continue;
    }

    const read = piece(command, at);
    if (!read) {
      return null;
    }
    at = read[1];
  }
  parts.push(command.slice(start));

  return parts;
}

/** What one plain command does in `conversationId` (`show`, `reply`, `read`, `resolve`), when that is all it does. */
function ownAction(command: string, conversationId: string): string | undefined {
  const words = simpleCommandWords(command);
  if (!words) {
    return undefined;
  }

  const start = cliLength(words);
  const action = words[start + 1] ?? '';

  return start > 0 && words[start] === 'inbox' && OWN_ACTIONS.has(action) && words[start + 2] === conversationId
    ? action
    : undefined;
}

/** What ends a plain command, outside quotes: chaining, pipes, the background, redirections, subshells. */
const OPERATORS = ';&|<>()`\n\r';

/** A stretch in single quotes, from just after the quote: its text and where it ends, or null if unclosed. */
function singleQuoted(command: string, at: number): [string, number] | null {
  const end = command.indexOf("'", at);

  return end < 0 ? null : [command.slice(at, end), end + 1];
}

/**
 * A stretch in double quotes, from just after the quote: its text and where it ends. Null if unclosed, or if it
 * runs a command (`$(…)` or backticks), which double quotes don't stop.
 */
function doubleQuoted(command: string, at: number): [string, number] | null {
  let text = '';
  for (let index = at; index < command.length; index++) {
    const char = command[index];
    const next = command[index + 1];
    if (char === '"') {
      return [text, index + 1];
    }
    if (char === '`' || (char === '$' && next === '(')) {
      return null;
    }
    if (char === '\\' && next !== undefined && '"\\$`\n'.includes(next)) {
      text += next;
      index += 1;
    } else {
      text += char;
    }
  }

  return null;
}

/** One piece of a word from `at`: a quoted stretch, an escaped character or a plain one. Null past one command. */
function piece(command: string, at: number): [string, number] | null {
  const char = command[at];
  const next = command[at + 1];

  if (char === "'") {
    return singleQuoted(command, at + 1);
  }
  if (char === '"') {
    return doubleQuoted(command, at + 1);
  }
  if (char === '\\') {
    return next === undefined || next === '\n' ? null : [next, at + 2];
  }
  if (OPERATORS.includes(char) || (char === '$' && next === '(')) {
    return null;
  }

  return [char, at + 1];
}

/**
 * The words of one plain shell command, or `null` when it is more than that: commands chained, piped or in
 * the background, a redirection, a subshell or a command substitution, even inside double quotes. Quotes and
 * backslashes are read as the shell reads them, so a reply may say anything inside its quotes.
 */
export function simpleCommandWords(command: string): string[] | null {
  const words: string[] = [];
  let word: string | null = null;
  let at = 0;

  while (at < command.length) {
    if (command[at] === ' ' || command[at] === '\t') {
      if (word !== null) {
        words.push(word);
        word = null;
      }
      at += 1;
      continue;
    }

    const read = piece(command, at);
    if (!read) {
      return null;
    }
    word = (word ?? '') + read[0];
    at = read[1];
  }

  if (word !== null) {
    words.push(word);
  }

  return words.length > 0 ? words : null;
}
