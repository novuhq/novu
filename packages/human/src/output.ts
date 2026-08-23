import pc from 'picocolors';
import type { Interaction } from './api/human';

/**
 * Exit-code contract (stable — agents branch on these):
 *   0  answered / approved / chosen / delivered
 *   1  error (transport, auth, validation)
 *  10  denied
 *  11  timed out waiting — interaction still pending, resumable via `human wait <id>`
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
      const label =
        interaction.options?.find((option) => option.id === interaction.response?.optionId)?.label ??
        interaction.response?.optionId;

      return `${pc.green('Chose')} "${label}"${by}${at}.`;
    }
    case 'delivered':
      return `${pc.green('Delivered')} to ${interaction.to} on ${interaction.platform}.`;
    case 'expired':
      return `${pc.yellow('Expired')} — nobody answered within the TTL.`;
    case 'canceled':
      return `${pc.yellow('Canceled')}.`;
    default:
      return `${pc.yellow('Still pending')} — resume with: ${pc.bold(`human wait ${interaction.id}`)}`;
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

export function fail(message: string): never {
  process.stderr.write(`${pc.red('error:')} ${message}\n`);
  process.exit(EXIT_ERROR);
}
