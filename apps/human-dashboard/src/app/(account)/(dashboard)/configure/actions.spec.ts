import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateAgentSettingsAction } from './actions';

const { requestForAccount } = vi.hoisted(() => ({ requestForAccount: vi.fn() }));

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/human-account', () => ({
  readHumanAccount: vi.fn(),
  requireHumanAccount: vi.fn().mockResolvedValue({ humanUserId: 'user_1' }),
}));
vi.mock('@/lib/human-api-key', () => ({ requestForAccount }));
vi.mock('@/lib/human-onboarding', () => ({ updateOnboardingState: vi.fn() }));

describe('updateAgentSettingsAction', () => {
  beforeEach(() => {
    requestForAccount.mockReset();
  });

  it('saves acknowledging incoming messages, and answers with the settings as the API has them', async () => {
    requestForAccount.mockResolvedValue({ reach: 'contacts', paused: false, acknowledgeOnReceived: true });

    await expect(updateAgentSettingsAction({ acknowledgeOnReceived: true })).resolves.toEqual({
      ok: true,
      settings: { reach: 'contacts', paused: null, acknowledgeOnReceived: true },
    });

    expect(requestForAccount.mock.calls[0][1]).toBe('/v1/human/agent');
    expect(requestForAccount.mock.calls[0][2]).toEqual({ method: 'PATCH', body: { acknowledgeOnReceived: true } });
  });

  it('reads an API from before this setting as not acknowledging', async () => {
    requestForAccount.mockResolvedValue({ reach: 'anyone', paused: false });

    await expect(updateAgentSettingsAction({ reach: 'anyone' })).resolves.toMatchObject({
      settings: { acknowledgeOnReceived: false },
    });
  });

  it('sends only the setting it knows, whatever else the browser put in the change', async () => {
    requestForAccount.mockResolvedValue({ reach: 'anyone', paused: false, acknowledgeOnReceived: false });
    const change = { acknowledgeOnReceived: false, name: 'Renamed' };

    await updateAgentSettingsAction(change);

    expect(requestForAccount.mock.calls[0][2].body).toEqual({ acknowledgeOnReceived: false });
  });

  it('refuses anything but true or false, without asking the API', async () => {
    const change = { acknowledgeOnReceived: 'yes' } as unknown as { acknowledgeOnReceived: boolean };

    await expect(updateAgentSettingsAction(change)).resolves.toEqual({
      ok: false,
      error: 'This setting can’t be changed.',
    });

    expect(requestForAccount).not.toHaveBeenCalled();
  });
});
