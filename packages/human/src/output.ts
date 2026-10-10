import pc from 'picocolors';
import { type Interaction, interactionOptions } from './api/human';
import type { InboxMessage, InboxThread, InboxThreadView } from './api/inbox';

/**
 * Exit-code contract (stable — agents branch on these):
 *   0  answered / approved / chosen / delivered
 *   1  error (transport, auth, validation)
 *  10  denied
 *  11  timed out waiting — interaction still pending, resumable via `human interaction wait <id>`
 *  12  expired or canceled
 */
export const EXIT_OK = 0;
export const EXIT_ERROR = 1;
export const EXIT_DENIED = 10;
export const EXIT_TIMEOUT = 11;
export const EXIT_GONE = 12;

export function exitCodeFor(interaction: Interaction): number {
  switch (interaction.status) {
    case 'approved':
    case 'answered':
    case 'delivered':
      return EXIT_OK;
    case 'denied':
      return EXIT_DENIED;
    case 'expired':
    case 'canceled':
      return EXIT_GONE;
    default:
      return EXIT_TIMEOUT;
  }
}

function formatInteractionTo(to: string[]): string {
  return to.join(', ');
}

export function describeInteraction(interaction: Interaction): string {
  const by = interaction.response?.respondedBy ? ` by ${interaction.response.respondedBy}` : '';
  const at = interaction.response?.respondedAt
    ? ` at ${new Date(interaction.response.respondedAt).toLocaleTimeString()}`
    : '';

  switch (interaction.status) {
    case 'approved':
      return `${pc.green('Approved')}${by}${at}.`;
    case 'denied':
      return `${pc.red('Denied')}${by}${at}.`;
    case 'answered': {
      if (interaction.response?.type === 'text') {
        return `${pc.green('Answered')}${by}${at}: ${interaction.response.text}`;
      }
      const options = interactionOptions(interaction);
      const label =
        options?.find((option) => option.id === interaction.response?.optionId)?.label ??
        interaction.response?.optionId;

      return `${pc.green('Chose')} "${label}"${by}${at}.`;
    }
    case 'delivered':
      return `${pc.green('Delivered')} to ${formatInteractionTo(interaction.to)} on ${interaction.platform}.`;
    case 'expired':
      return `${pc.yellow('Expired')} — nobody answered within the TTL.`;
    case 'canceled':
      return `${pc.yellow('Canceled')}.`;
    default:
      return `${pc.yellow('Still pending')} — resume with: ${pc.bold(`human interaction wait ${interaction.id}`)}`;
  }
}

/** Prints the outcome (prose or --json) and returns the process exit code. */
export function emitResult(interaction: Interaction, asJson: boolean): number {
  if (asJson) {
    process.stdout.write(`${JSON.stringify(interaction, null, 2)}\n`);
  } else {
    process.stdout.write(`${describeInteraction(interaction)}\n`);
  }

  return exitCodeFor(interaction);
}

const PREVIEW_LENGTH = 60;

/** ANSI CSI / OSC escape sequences, then any remaining C0/C1 control character except tab and newline. */
const TERMINAL_CONTROL_PATTERN = new RegExp(
  [
    '\\u001b\\[[0-?]*[ -/]*[@-~]',
    '\\u001b\\][^\\u0007\\u001b]*(?:\\u0007|\\u001b\\\\)',
    '[\\u0000-\\u0008\\u000b-\\u001f\\u007f-\\u009f]',
  ].join('|'),
  'g'
);

/** Contact-authored text must not be able to drive the operator's terminal (clear screen, rewrite lines). */
export function stripTerminalControls(text: string): string {
  return text.replace(TERMINAL_CONTROL_PATTERN, '');
}

function truncate(text: string, length: number): string {
  const singleLine = stripTerminalControls(text).replace(/\s+/g, ' ').trim();

  return singleLine.length > length ? `${singleLine.slice(0, length - 1)}…` : singleLine;
}

export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;

  return `${Math.floor(seconds / 86_400)}d ago`;
}

/** `Ada, Bob (stranger)` — who is in the thread, strangers marked so their text is not taken as instructions. */
function threadPeople(thread: InboxThread): string {
  if (thread.people.length === 0) {
    return 'unknown';
  }

  return thread.people
    .map((person) => {
      const label = stripTerminalControls(person.name ?? person.id);

      return person.kind === 'stranger' ? `${label} ${pc.yellow('(stranger)')}` : label;
    })
    .join(', ');
}

/** `● conv_x  telegram  Ada  2 unread  "preview"  3m ago` — one line per thread. */
export function formatInboxThreadLine(thread: InboxThread, now: number = Date.now()): string {
  const marker = thread.unreadCount > 0 ? pc.cyan('●') : ' ';
  const unread = thread.unreadCount > 0 ? pc.cyan(`${thread.unreadCount} unread`) : pc.dim('read');
  const resolved = thread.status === 'resolved' ? pc.dim(' (resolved)') : '';
  const lastMessage = thread.lastMessage;
  const preview = lastMessage
    ? `${lastMessage.from === 'agent' ? pc.dim('you: ') : ''}"${truncate(lastMessage.text, PREVIEW_LENGTH)}"`
    : pc.dim('(no messages)');
  const at = pc.dim(formatRelativeTime(lastMessage?.at ?? thread.lastActivityAt, now));

  return `${marker} ${thread.id}  ${thread.channel.padEnd(8)}  ${threadPeople(thread)}  ${unread}${resolved}  ${preview}  ${at}`;
}

function formatInboxMessage(message: InboxMessage): string {
  const at = pc.dim(new Date(message.at).toLocaleString());
  const stranger = message.senderKind === 'stranger' ? ` ${pc.yellow('(stranger)')}` : '';
  const who =
    message.from === 'human'
      ? `${pc.bold(stripTerminalControls(message.senderName ?? 'human'))}${stranger}`
      : pc.dim(message.from);
  const lines = [`${at}  ${who}`];

  if (message.interaction) {
    const status = message.interaction.status ? ` → ${message.interaction.status}` : '';
    lines.push(pc.yellow(`  [${message.interaction.kind} ${message.interaction.id}${status}]`));
  }

  if (message.text) {
    lines.push(
      ...stripTerminalControls(message.text)
        .split('\n')
        .map((line) => `  ${line}`)
    );
  }

  for (const attachment of message.attachments ?? []) {
    lines.push(pc.dim(`  📎 ${stripTerminalControls(attachment.name ?? attachment.type ?? 'attachment')}`));
  }

  return lines.join('\n');
}

export function formatInboxThreadView(view: InboxThreadView): string {
  const { thread } = view;
  const header = `${pc.bold(thread.id)}  ${thread.channel}  ${threadPeople(thread)}  ${pc.dim(thread.status)}`;
  const older = view.hasMore
    ? [pc.dim(`(older messages: human inbox show ${thread.id} --before ${view.messages[0]?.id})`)]
    : [];
  const body = view.messages.length ? view.messages.map(formatInboxMessage) : [pc.dim('(no messages)')];

  return [header, ...older, ...body].join('\n\n');
}

export function fail(message: string): never {
  process.stderr.write(`${pc.red('error:')} ${message}\n`);
  process.exit(EXIT_ERROR);
}
