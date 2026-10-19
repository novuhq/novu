import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { SetupStillPendingError } from '../output';
import { stripEscapes } from '../screen/terminal';
import { describeFailure } from './failure';
import { handleError } from './interact';

class Exited extends Error {
  constructor(readonly code: number) {
    super(`exit ${code}`);
  }
}

/** What `handleError` prints for `err`, without colours, and the code it exits with. */
function handled(err: unknown) {
  let printed = '';
  vi.spyOn(process.stderr, 'write').mockImplementation((chunk: string | Uint8Array) => {
    printed += String(chunk);

    return true;
  });
  vi.spyOn(process, 'exit').mockImplementation(((code: number) => {
    throw new Exited(code);
  }) as never);

  try {
    handleError(err);
  } catch (exit) {
    if (!(exit instanceof Exited)) throw exit;

    return { printed: stripEscapes(printed), exitCode: exit.code };
  } finally {
    vi.restoreAllMocks();
  }

  throw new Error('handleError did not exit');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('describeFailure', () => {
  const failures: Array<[string, unknown]> = [
    ['an API error', new ApiError('This code expired.', 410, 'POST /v1/human/connect', {})],
    ['an API error without a status', new ApiError('Network down', 0, 'GET /v1/x', {})],
    [
      'the keyless demo running out',
      new ApiError('Keyless demo cap reached', 429, 'POST /v1/human/interactions', {
        code: 'KEYLESS_HUMAN_CAP_REACHED',
        cap: 25,
        browserLogin: true,
        claimUrl: 'https://agentinbox.md/claim/abc',
      }),
    ],
    ['a setup still pending', new SetupStillPendingError('The Telegram setup link expired before it was completed.')],
    ['any other error', new Error("We didn't see your /start on @atlas_bot within 300s.")],
    ['something thrown that is not an error', 'plain words'],
  ];

  it.each(failures)('says what handleError prints for %s, and exits the same', (_, err) => {
    const { printed, exitCode } = handled(err);
    const failure = describeFailure(err);

    expect(printed).toBe(`${failure.pending ? 'pending:' : 'error:'} ${failure.message}\n`);
    expect(failure.exitCode).toBe(exitCode);
  });

  it('exits 11 for a setup still pending, and 1 for the rest', () => {
    expect(describeFailure(new SetupStillPendingError('later')).exitCode).toBe(11);
    expect(describeFailure(new Error('no')).exitCode).toBe(1);
  });
});
