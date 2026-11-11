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
    ['an API error', new ApiError('This code expired.', 410, 'POST /v1/connect', {})],
    ['an API error without a status', new ApiError('Network down', 0, 'GET /v1/x', {})],
    [
      'the keyless demo running out',
      new ApiError('Keyless demo cap reached', 429, 'POST /v1/inbox/messages', {
        code: 'KEYLESS_HUMAN_CAP_REACHED',
        cap: 25,
        browserLogin: true,
        claimUrl: 'https://agentinbox.md/claim/abc',
      }),
    ],
    [
      'WhatsApp refusing a send outside the window',
      new ApiError("WhatsApp can't reach bob", 422, 'POST /v1/inbox/messages', {
        code: 'whatsapp_window_closed',
        subscriberId: 'bob',
        windowClosedAt: '2026-11-10T14:05:00.000Z',
        availableChannels: ['telegram'],
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

describe('a send WhatsApp refused', () => {
  function refusal(body: Record<string, unknown>) {
    return describeFailure(new ApiError('WhatsApp refused', 422, 'POST /v1/inbox/messages', body));
  }

  it('says the window is shut, when it opens again, and the channel to send on instead', () => {
    const failure = refusal({
      code: 'whatsapp_window_closed',
      subscriberId: 'bob',
      windowClosedAt: '2026-11-10T14:05:00.000Z',
      availableChannels: ['telegram', 'email'],
    });

    expect(failure.exitCode).toBe(1);
    expect(failure.message).toContain("WhatsApp can't reach bob right now");
    expect(failure.message).toContain('within 24 hours of their last message, and theirs closed on ');
    expect(failure.message).toContain('It opens again when they write to you.');
    expect(failure.message).toContain("Send it with --via telegram instead (they're also on email).");
    expect(failure.message).not.toContain('(422)');
  });

  it('points to an invite when they have no other channel', () => {
    expect(refusal({ code: 'whatsapp_window_closed', subscriberId: 'bob', availableChannels: [] }).message).toContain(
      'bob has no other channel: add one with `npx @agentinbox/cli contact invite bob`.'
    );
  });

  it('says how many buttons WhatsApp shows', () => {
    const { message } = refusal({
      code: 'whatsapp_too_many_buttons',
      subscriberId: 'bob',
      maxButtons: 3,
      buttons: 4,
      availableChannels: ['slack'],
    });

    expect(message).toContain('WhatsApp shows at most 3 buttons and this has 4. Offer 3 options or fewer.');
    expect(message).toContain('Send it with --via slack instead.');
  });

  it('leaves any other 422 as the API worded it', () => {
    expect(refusal({ code: 'something_else' }).message).toBe('WhatsApp refused (422)');
  });
});
