import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getRelayAgent: vi.fn(),
  ensureWhatsAppChannel: vi.fn(),
  connectWhatsApp: vi.fn(),
  issueWhatsAppLink: vi.fn(),
  readWhatsAppSetup: vi.fn(),
  findOperatorContactId: vi.fn(),
  ensureRelay: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('@clerk/nextjs/server', () => ({ currentUser: vi.fn().mockResolvedValue(null) }));
vi.mock('@/lib/human-account', () => ({ requireHumanAccount: vi.fn().mockResolvedValue({ humanUserId: 'user_1' }) }));
vi.mock('@/lib/human-agent-api', () => ({
  AGENT_NOT_SET_UP_MESSAGE: 'Set up your agent first.',
  getRelayAgent: mocks.getRelayAgent,
}));
vi.mock('@/lib/human-channels-api', () => ({
  ensureWhatsAppChannel: mocks.ensureWhatsAppChannel,
  connectWhatsApp: mocks.connectWhatsApp,
  issueWhatsAppLink: mocks.issueWhatsAppLink,
}));
vi.mock('@/lib/human-operator', () => ({
  ensureOperatorContact: vi.fn(),
  ensureRelay: mocks.ensureRelay,
  findOperatorContactId: mocks.findOperatorContactId,
}));
vi.mock('@/lib/human-slack-setup', () => ({ readSlackSetup: vi.fn() }));
vi.mock('@/lib/human-telegram-setup', () => ({ readTelegramSetup: vi.fn() }));
vi.mock('@/lib/human-whatsapp-setup', () => ({ readWhatsAppSetup: mocks.readWhatsAppSetup }));

const { HumanApiError } = await import('@/lib/human-api-error');
const { checkWhatsAppConnectedAction, connectWhatsAppAction, issueWhatsAppLinkAction } = await import('./actions');

const SIGNUP = { code: ' meta-code ', wabaId: 'waba-1', phoneNumberId: 'phone-1' };

describe('connectWhatsAppAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRelayAgent.mockResolvedValue({ id: 'relay1' });
    mocks.findOperatorContactId.mockResolvedValue('operator1');
    mocks.ensureRelay.mockResolvedValue({ agentId: 'relay1', contactId: 'operator1' });
    mocks.ensureWhatsAppChannel.mockResolvedValue('whatsapp-main');
  });

  it('gives the relay its WhatsApp channel, then finishes the signup on it', async () => {
    mocks.connectWhatsApp.mockResolvedValue({ success: true, displayPhoneNumber: '+1 555' });

    await expect(connectWhatsAppAction(SIGNUP)).resolves.toEqual({ ok: true, displayPhoneNumber: '+1 555' });

    expect(mocks.ensureWhatsAppChannel.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.connectWhatsApp.mock.invocationCallOrder[0]
    );
    expect(mocks.connectWhatsApp.mock.calls[0][1]).toBe('whatsapp-main');
    expect(mocks.connectWhatsApp.mock.calls[0][2]).toEqual({
      code: 'meta-code',
      wabaId: 'waba-1',
      phoneNumberId: 'phone-1',
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/configure');
  });

  it('passes on a saved number Meta did not register yet as a warning', async () => {
    mocks.connectWhatsApp.mockResolvedValue({
      success: true,
      displayPhoneNumber: '+1 555',
      phoneRegistrationWarning: 'Register the number in Meta.',
    });

    await expect(connectWhatsAppAction(SIGNUP)).resolves.toEqual({
      ok: true,
      displayPhoneNumber: '+1 555',
      warning: 'Register the number in Meta.',
    });
  });

  it('says what went wrong on Meta’s side in words the operator can act on', async () => {
    mocks.connectWhatsApp.mockResolvedValue({
      success: false,
      error: { code: 'meta_validation_failed', message: 'phone not in waba' },
    });

    const result = await connectWhatsAppAction(SIGNUP);

    expect(result).toMatchObject({ ok: false });
    expect(result.ok === false && result.error).toContain('isn’t part of the WhatsApp Business account');
  });

  it('turns away a signup Facebook did not finish, without calling the API', async () => {
    await expect(
      connectWhatsAppAction({ code: '', wabaId: 'waba-1', phoneNumberId: 'phone-1' })
    ).resolves.toMatchObject({ ok: false });

    expect(mocks.ensureWhatsAppChannel).not.toHaveBeenCalled();
    expect(mocks.connectWhatsApp).not.toHaveBeenCalled();
  });

  it('needs the agent to be set up first', async () => {
    mocks.getRelayAgent.mockResolvedValue(null);

    await expect(connectWhatsAppAction(SIGNUP)).resolves.toEqual({ ok: false, error: 'Set up your agent first.' });
    expect(mocks.connectWhatsApp).not.toHaveBeenCalled();
  });

  it('reads WhatsApp being turned off as not available yet', async () => {
    mocks.connectWhatsApp.mockRejectedValue(new HumanApiError(422, 'unprocessable', 'Unknown channel "whatsapp".'));

    await expect(connectWhatsAppAction(SIGNUP)).resolves.toEqual({
      ok: false,
      error: 'WhatsApp isn’t available for your account yet.',
    });
  });
});

describe('issueWhatsAppLinkAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hands the drawer a wa.me link with the operator’s code', async () => {
    const link = { url: 'https://wa.me/15550100199?text=x', code: 'BCDF-GHJK', expiresAt: '2026-11-10T15:00:00.000Z' };
    mocks.issueWhatsAppLink.mockResolvedValue(link);

    expect(await issueWhatsAppLinkAction()).toEqual({ ok: true, ...link });
  });

  it('asks to connect again when WhatsApp never said which number is linked', async () => {
    mocks.issueWhatsAppLink.mockRejectedValue(
      new HumanApiError(409, 'whatsapp_number_unknown', 'WhatsApp didn’t say which number is connected.')
    );

    expect(await issueWhatsAppLinkAction()).toEqual({
      ok: false,
      error: 'WhatsApp didn’t say which number is connected. Connect WhatsApp again.',
    });
  });

  it('says WhatsApp is not offered when the API refuses it', async () => {
    mocks.issueWhatsAppLink.mockRejectedValue(new HumanApiError(422, 'unprocessable', 'Unknown channel'));

    expect(await issueWhatsAppLinkAction()).toEqual({
      ok: false,
      error: 'WhatsApp isn’t available for your account yet.',
    });
  });
});

describe('checkWhatsAppConnectedAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps waiting until the operator’s own number is bound', async () => {
    mocks.readWhatsAppSetup.mockResolvedValue({ step: 'verify', displayPhoneNumber: '+1 555' });

    expect(await checkWhatsAppConnectedAction()).toBeNull();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it('hands back the connected setup and refreshes the page once it is', async () => {
    const connected = { step: 'connected', displayPhoneNumber: '+1 555', operatorPhoneNumber: '+15550100199' };
    mocks.readWhatsAppSetup.mockResolvedValue(connected);

    expect(await checkWhatsAppConnectedAction()).toEqual(connected);
    expect(mocks.revalidatePath).toHaveBeenCalled();
  });
});
