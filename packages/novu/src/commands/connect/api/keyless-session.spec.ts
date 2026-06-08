import { AgentRuntimeProviderIdEnum } from '@novu/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn();
const listIntegrations = vi.fn();

vi.mock('../../shared/novu-http', () => ({
  createNovuAxios: vi.fn(() => ({ post })),
  extractNovuApiMessage: (body: unknown) => {
    if (!body || typeof body !== 'object') return undefined;
    const message = (body as { message?: string }).message;

    return typeof message === 'string' ? message : undefined;
  },
}));

vi.mock('./client', () => ({
  createConnectApiClient: vi.fn(() => ({ axios: {} })),
}));

vi.mock('./integrations', () => ({
  listIntegrations: (...args: unknown[]) => listIntegrations(...args),
}));

import { bootstrapKeylessSession } from './keyless-session';

const apiUrl = 'http://localhost:3000';
const storedIdentifier = 'pk_keyless_00000001_abcd';
const freshIdentifier = 'pk_keyless_00000002_efgh';

function sessionResponse(applicationIdentifier: string, status = 200) {
  return {
    status,
    data: { data: { applicationIdentifier } },
  };
}

function demoIntegration() {
  return {
    _id: 'demo-1',
    identifier: 'novu-anthropic',
    name: 'Novu Demo Claude',
    providerId: AgentRuntimeProviderIdEnum.NovuAnthropic,
    kind: 'agent',
    active: true,
  };
}

describe('bootstrapKeylessSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listIntegrations.mockResolvedValue([demoIntegration()]);
  });

  it('reuses a stored keyless session when the environment is still ready', async () => {
    post.mockResolvedValueOnce(sessionResponse(storedIdentifier));

    const result = await bootstrapKeylessSession(apiUrl, storedIdentifier);

    expect(result).toEqual({
      applicationIdentifier: storedIdentifier,
      recoveredFromStaleSession: false,
    });
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][1]).toEqual({ applicationIdentifier: storedIdentifier });
    expect(listIntegrations).toHaveBeenCalledTimes(1);
  });

  it('starts a fresh session when the stored environment no longer exists', async () => {
    post
      .mockResolvedValueOnce({
        status: 400,
        data: { message: 'Please provide a valid application identifier' },
      })
      .mockResolvedValueOnce(sessionResponse(freshIdentifier));

    const result = await bootstrapKeylessSession(apiUrl, storedIdentifier);

    expect(result).toEqual({
      applicationIdentifier: freshIdentifier,
      recoveredFromStaleSession: true,
    });
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[1][1]).toEqual({});
    expect(listIntegrations).toHaveBeenCalledTimes(1);
  });

  it('starts a fresh session when the stored environment was claimed and lost its demo integration', async () => {
    post
      .mockResolvedValueOnce(sessionResponse(storedIdentifier))
      .mockResolvedValueOnce(sessionResponse(freshIdentifier));
    listIntegrations.mockResolvedValueOnce([]).mockResolvedValueOnce([demoIntegration()]);

    const result = await bootstrapKeylessSession(apiUrl, storedIdentifier);

    expect(result).toEqual({
      applicationIdentifier: freshIdentifier,
      recoveredFromStaleSession: true,
    });
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[1][1]).toEqual({});
    expect(listIntegrations).toHaveBeenCalledTimes(2);
  });

  it('creates a new session when no stored identifier exists', async () => {
    post.mockResolvedValueOnce(sessionResponse(freshIdentifier));

    const result = await bootstrapKeylessSession(apiUrl);

    expect(result).toEqual({
      applicationIdentifier: freshIdentifier,
      recoveredFromStaleSession: false,
    });
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][1]).toEqual({});
  });

  it('propagates integration-list failures instead of treating them as stale sessions', async () => {
    post.mockResolvedValueOnce(sessionResponse(storedIdentifier));
    listIntegrations.mockRejectedValueOnce(new Error('network down'));

    await expect(bootstrapKeylessSession(apiUrl, storedIdentifier)).rejects.toThrow('network down');
    expect(post).toHaveBeenCalledTimes(1);
  });
});
