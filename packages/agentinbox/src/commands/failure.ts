import { ApiError } from '../api/client';
import { EXIT_ERROR, EXIT_TIMEOUT, SetupStillPendingError } from '../output';
import type { Screen } from '../screen/screen';
import { formatKeylessCapMessage, getKeylessCapDetails } from './interact';

/** How a command ends on an error: the words, whether it is only still pending, and the exit code. */
export interface Failure {
  message: string;
  pending: boolean;
  exitCode: number;
}

/**
 * What `handleError` (in `./interact`) prints for `err`, without its `error:` or `pending:` label, and the
 * code it exits with. Keep the two in step; a test holds them to it.
 */
export function describeFailure(err: unknown): Failure {
  const keylessCap = getKeylessCapDetails(err);
  if (keylessCap) {
    return { message: formatKeylessCapMessage(keylessCap), pending: false, exitCode: EXIT_ERROR };
  }

  if (err instanceof ApiError) {
    return {
      message: err.status ? `${err.message} (${err.status})` : err.message,
      pending: false,
      exitCode: EXIT_ERROR,
    };
  }

  if (err instanceof SetupStillPendingError) {
    return { message: err.message, pending: true, exitCode: EXIT_TIMEOUT };
  }

  return { message: err instanceof Error ? err.message : String(err), pending: false, exitCode: EXIT_ERROR };
}

/**
 * Ends the command on `err` on its screen: the same words `handleError` prints, as the screen's last row with
 * the mascot asleep, and the same exit code.
 */
export async function failOnScreen(screen: Screen, err: unknown): Promise<never> {
  const { message, pending, exitCode } = describeFailure(err);
  await screen.fail(message, { pending });

  return process.exit(exitCode);
}
