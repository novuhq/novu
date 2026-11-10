import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getRelayAgent: vi.fn(),
  ensureWhatsAppChannel: vi.fn(),
  connectWhatsApp: vi.fn(),
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
}));
vi.mock('@/lib/human-operator', () => ({
  ensureOperatorContact: vi.fn(),
  ensureRelay: mocks.ensureRelay,
  findOperatorContactId: mocks.findOperatorContactId,
}));
vi.mock('@/lib/human-slack-setup', () => ({ readSlackSetup: vi.fn() }));
vi.mock('@/lib/human-telegram-setup', () => ({ readTelegramSetup: vi.fn() }));
vi.mock('@/lib/human-whatsapp-setup', () => ({ readWhatsAppSetup: vi.fn() }));

const { HumanApiError } = await import('@/lib/human-api-error');
const { connectWhatsAppAction } = await import('./actions');

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
