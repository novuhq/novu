import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HumanAccount } from './human-account';
import { getRelayAgent } from './human-agent-api';
import { HumanApiError } from './human-api-error';

const { requestForAccount } = vi.hoisted(() => ({ requestForAccount: vi.fn() }));

vi.mock('server-only', () => ({}));
vi.mock('./human-api-key', () => ({ requestForAccount }));

describe('getRelayAgent', () => {
  const account = { humanUserId: 'user_1' } as HumanAccount;
  const noAgent = new HumanApiError(404, 'not_found', 'There is no agent yet.');

  let logged: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    requestForAccount.mockReset();
  });

  it('finds nothing, and reports nothing, for an account without an agent', async () => {
    requestForAccount.mockRejectedValue(noAgent);

    await expect(getRelayAgent(account)).resolves.toBeNull();
    expect(logged).not.toHaveBeenCalled();
  });

  it('still shows the agent when its picture and settings can’t be read, and reports that', async () => {
    const failure = new HumanApiError(500, 'unavailable', 'Something went wrong. Please try again.');
    requestForAccount.mockImplementation(async (_account: HumanAccount, path: string) => {
      if (path === '/v1/human/agent') {
        throw failure;
      }

      return { _id: 'agent_1', identifier: 'human-relay', name: 'Ada', active: true };
    });

    await expect(getRelayAgent(account)).resolves.toMatchObject({
      id: 'agent_1',
      settings: null,
      pictureUrl: undefined,
    });
    expect(logged).toHaveBeenCalledWith(expect.any(String), failure);
  });
});
