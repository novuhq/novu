import type { PermissionQuestion } from './host-adapter';

/**
 * The started agent answers people with the CLI (`inbox reply <conversation> …`), or with our MCP server's tools
 * when its host has them, and its host asks before running either. Those questions aren't for the operator:
 * the listener allows them by itself, but only the agent's reading and replying in the very conversation it was started for,
 * as plain commands (one, or several joined with `&&`) or one tool call, and only with what keeps them there:
 * nothing that sends elsewhere (`--api-url`, `--to`) or lets more people answer (`--anyone`). Anything else,
 * writing to someone new included, still asks the operator.
 */

/**
 * What the agent may do in its own conversation without asking (read it, answer in it, close it), and what may
 * follow the conversation id: the message's words, for `reply`, and these flags, `true` for one that takes a
 * value. The rest of the CLI's flags, and any it doesn't have, ask the operator.
 */
type Allowed = { words: boolean; flags: ReadonlyMap<string, boolean> };

const OWN_ACTIONS = new Map<string, Allowed>([
  [
    'show',
    {
      words: false,
      flags: new Map([
        ['--limit', true],
        ['--before', true],
        ['--json', false],
      ]),
    },
  ],
  ['read', { words: false, flags: new Map([['--json', false]]) }],
  ['resolve', { words: false, flags: new Map([['--json', false]]) }],
  [
    'reply',
    {
      words: true,
      flags: new Map([
        ['--from', true],
        ['--ttl', true],
        ['--timeout', true],
        ['--async', false],
        ['--option', true],
        ['--approve-label', true],
        ['--deny-label', true],
        ['--extra-action', true],
        ['--icon', true],
        ['--subtitle', true],
        ['--body', true],
        ['--json', false],
      ]),
    },
  ],
]);

/**
 * A reply in the conversation, also one that reaches more people (`--to`, `--anyone`), which asks the operator
 * first: it still goes into the conversation, and the answer to a question it asks comes back there.
 */
const REPLY_IN_CONVERSATION = new Map<string, Allowed>([
  [
    'reply',
    {
      words: true,
      flags: new Map([...(OWN_ACTIONS.get('reply')?.flags ?? []), ['--to', true], ['--anyone', false]]),
    },
  ],
]);

/** The same, as our MCP server's tools and the fields each may be called with: never `to` or `anyone_may_answer`. */
const OWN_TOOLS = new Map<string, ReadonlySet<string>>([
  ['inbox_show', new Set(['conversation', 'limit', 'before'])],
  ['inbox_read', new Set(['conversation'])],
  ['inbox_resolve', new Set(['conversation'])],
  [
    'inbox_reply',
    new Set([
      'conversation',
      'kind',
      'message',
      'from',
      'ttl_seconds',
      'wait_seconds',
      'icon',
      'subtitle',
      'body',
      'approve_label',
      'deny_label',
      'extra_actions',
      'options',
    ]),
  ],
]);

/** Whether the host asks for the agent's own reading or answering in `conversationId`, and nothing more. */
export function isOwnReplySubject(subject: PermissionQuestion['subject'], conversationId: string): boolean {
  switch (subject.kind) {
    case 'command':
      return isOwnReply(subject.command, conversationId);
    case 'mcp': {
      const fields = OWN_TOOLS.get(subject.tool);

      return (
        isOurMcpServer(subject.server) &&
        fields !== undefined &&
        subject.input.conversation === conversationId &&
        Object.keys(subject.input).every((field) => fields.has(field))
      );
    }
    default:
      return false;
  }
}

/**
 * Our MCP server, by the names hosts give it: `AgentInbox` (`codex mcp add AgentInbox …`, the name our docs use),
 * the agentinbox plugin's `plugin_agentinbox_AgentInbox`, a claude.ai connector named after Agent Inbox
 * (`claude_ai_Agent_Inbox`), and `inbox`, the name the docs used before.
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
  return andParts(command)?.every((part) => ownCommand(part, conversationId) !== undefined) ?? false;
}

/**
 * Whether the host is about to answer in `conversationId`: `inbox reply` there, as a command or our MCP server's
 * tool. The chat gets the answer then, not "typing…" after it.
 */
export function repliesIn(subject: PermissionQuestion['subject'], conversationId: string): boolean {
  switch (subject.kind) {
    case 'command':
      return (
        andParts(subject.command)?.some(
          (part) => ownCommand(part, conversationId, REPLY_IN_CONVERSATION)?.action === 'reply'
        ) ?? false
      );
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

/** What a reply that asks starts with: it waits for the answer, unless told not to. */
const ASKING = new Set(['ask', 'approve', 'choose']);

/**
 * Whether the host is about to ask someone in `conversationId` and wait for the answer: `inbox reply` there with
 * `ask`, `approve` or `choose` and without `--async`, or our MCP server's `inbox_reply` with such a kind, which
 * waits unless `wait_seconds` is 0. Whoever else it asks, the answer comes back to the conversation, and goes to
 * that command while it waits.
 */
export function waitsForAnswerIn(subject: PermissionQuestion['subject'], conversationId: string): boolean {
  switch (subject.kind) {
    case 'command':
      return (
        andParts(subject.command)?.some((part) => {
          const own = ownCommand(part, conversationId, REPLY_IN_CONVERSATION);

          return own?.action === 'reply' && ASKING.has(own.words[0] ?? '') && !own.flags.has('--async');
        }) ?? false
      );
    case 'mcp':
      return (
        repliesIn(subject, conversationId) && ASKING.has(String(subject.input.kind)) && subject.input.wait_seconds !== 0
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

/** One plain command of the agent's own in its conversation: what it does, and the words and flags after the id. */
interface OwnCommand {
  action: string;
  /** The message's words, for `reply`: `ask`, `approve` or `choose` first when it asks. */
  words: string[];
  flags: Set<string>;
}

/**
 * What one plain command does in `conversationId` (`show`, `reply`, `read`, `resolve`), when that is all it does,
 * with no more than `actions` lets it.
 */
function ownCommand(
  command: string,
  conversationId: string,
  actions: ReadonlyMap<string, Allowed> = OWN_ACTIONS
): OwnCommand | undefined {
  const words = simpleCommandWords(command);
  if (!words) {
    return undefined;
  }

  const start = cliLength(words);
  const action = words[start + 1] ?? '';
  const allowed = actions.get(action);
  if (start === 0 || words[start] !== 'inbox' || !allowed || words[start + 2] !== conversationId) {
    return undefined;
  }

  const rest = readRest(words.slice(start + 3), allowed);

  return rest ? { action, ...rest } : undefined;
}

/**
 * What follows the conversation id, when it keeps to what its action allows: known flags, and the message's words
 * only where the action takes them. A word that starts with `-` is always read as a flag, even where the CLI would
 * take it as a value, and `--`, which makes the rest words, isn't known.
 */
function readRest(rest: readonly string[], allowed: Allowed): Omit<OwnCommand, 'action'> | null {
  const words: string[] = [];
  const flags = new Set<string>();

  for (let at = 0; at < rest.length; at++) {
    const word = rest[at];
    if (word.startsWith('-')) {
      const flag = readFlag(rest, at, allowed.flags);
      if (!flag) {
        return null;
      }
      flags.add(flag.name);
      at = flag.last;
    } else if (allowed.words) {
      words.push(word);
    } else {
      return null;
    }
  }

  return { words, flags };
}

/**
 * The flag at `at`, when it is one of `known`, with its value when it takes one (`--ttl 10m` or `--ttl=10m`): its
 * name, and where its last word is. A value that starts with `-` isn't one.
 */
function readFlag(
  rest: readonly string[],
  at: number,
  known: ReadonlyMap<string, boolean>
): { name: string; last: number } | null {
  const word = rest[at];
  const equals = word.startsWith('--') ? word.indexOf('=') : -1;
  const name = equals > 2 ? word.slice(0, equals) : word;
  const takesValue = known.get(name);
  if (takesValue === undefined || (equals > 2 && !takesValue)) {
    return null;
  }
  if (!takesValue || equals > 2) {
    return { name, last: at };
  }

  const value = rest[at + 1];

  return value === undefined || value.startsWith('-') ? null : { name, last: at + 1 };
}

/** What ends a plain command, outside quotes: chaining, pipes, the background, redirections, subshells. */
const OPERATORS = ';&|<>()`\n\r';

/**
 * What the shell expands outside quotes into words of its own: a variable (`$`), a file name pattern (`*`, `?`,
 * `[`) and braces (`{`). Any of them could become a flag the command never showed, such as `--api-url`: an
 * unset variable's default, or a file the agent made named like one.
 */
const EXPANDS = '$*?[{';

/** A stretch in single quotes, from just after the quote: its text and where it ends, or null if unclosed. */
function singleQuoted(command: string, at: number): [string, number] | null {
  const end = command.indexOf("'", at);

  return end < 0 ? null : [command.slice(at, end), end + 1];
}

/**
 * A stretch in double quotes, from just after the quote: its text and where it ends. Null if unclosed, or if the
 * shell would change it there, which double quotes don't stop: a variable or a command (`$`, backticks).
 */
function doubleQuoted(command: string, at: number): [string, number] | null {
  let text = '';
  for (let index = at; index < command.length; index++) {
    const char = command[index];
    const next = command[index + 1];
    if (char === '"') {
      return [text, index + 1];
    }
    if (char === '`' || char === '$') {
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
  if (OPERATORS.includes(char) || EXPANDS.includes(char)) {
    return null;
  }

  return [char, at + 1];
}

/**
 * The words of one plain shell command, or `null` when it is more than that: commands chained, piped or in
 * the background, a redirection, a subshell, or anything the shell expands, such as a variable or a command
 * substitution, even inside double quotes. Quotes and backslashes are read as the shell reads them, so a reply
 * may say anything in single quotes.
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
