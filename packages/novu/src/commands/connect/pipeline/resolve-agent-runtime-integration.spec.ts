import { AgentRuntimeProviderIdEnum } from '@novu/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CloudRegionEnum } from '../../dev/enums';
import type { ConnectApiClient } from '../api/client';
import { NovuApiError } from '../api/client';
import type { ConnectCommandOptions } from '../types';
import type { ConnectUI } from '../ui/ui';
import { resolveAgentRuntimeIntegration } from './resolve-agent-runtime-integration';

const listIntegrations = vi.fn();
const verifyManagedCredentials = vi.fn();
const createAgentRuntimeIntegration = vi.fn();

vi.mock('../api/integrations', () => ({
  listIntegrations: (...args: unknown[]) => listIntegrations(...args),
  verifyManagedCredentials: (...args: unknown[]) => verifyManagedCredentials(...args),
  createAgentRuntimeIntegration: (...args: unknown[]) => createAgentRuntimeIntegration(...args),
}));

function createUi(overrides: Partial<ConnectUI> = {}): ConnectUI {
  return {
    pickAgentIntegration: vi.fn(),
    promptForSecretInput: vi.fn().mockResolvedValue('sk-ant-test-key'),
    pickAwsClaudeRegion: vi.fn(),
    verifyingCredentials: vi.fn(),
    credentialsVerified: vi.fn(),
    ...overrides,
  } as ConnectUI;
}

function createClient(): ConnectApiClient {
  return { axios: {} } as ConnectApiClient;
}

function createOptions(overrides: Partial<ConnectCommandOptions> = {}): ConnectCommandOptions {
  return {
    region: CloudRegionEnum.US,
    apiUrl: 'http://localhost:3000',
    dashboardUrl: 'http://localhost:4200',
    connectDashboardUrl: 'http://localhost:4201',
    ...overrides,
  };
}

describe('resolveAgentRuntimeIntegration credential retry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listIntegrations.mockResolvedValue([]);
    createAgentRuntimeIntegration.mockResolvedValue({
      _id: 'integration-1',
      identifier: 'connect-anthropic',
      name: 'Novu Connect Anthropic',
      providerId: AgentRuntimeProviderIdEnum.Anthropic,
    });
  });

  it('re-prompts for credentials after verification fails in interactive mode', async () => {
    const promptForSecretInput = vi.fn().mockResolvedValueOnce('bad-key').mockResolvedValueOnce('good-key');
    const ui = createUi({ promptForSecretInput });
    verifyManagedCredentials
      .mockRejectedValueOnce(
        new NovuApiError('Invalid API key', 401, 'POST http://localhost/v1/agents/verify-credentials', null)
      )
      .mockResolvedValueOnce(undefined);

    const result = await resolveAgentRuntimeIntegration(createClient(), ui, createOptions(), 'claude', 'env-1');

    expect(promptForSecretInput).toHaveBeenCalledTimes(2);
    expect(promptForSecretInput.mock.calls[1][0]).toMatchObject({
      verificationError: expect.stringContaining('Invalid API key'),
    });
    expect(verifyManagedCredentials).toHaveBeenCalledTimes(2);
    expect(ui.credentialsVerified).toHaveBeenCalledTimes(1);
    expect(result.integrationId).toBe('integration-1');
  });

  it('re-prompts when submitted credentials are incomplete in interactive mode', async () => {
    const promptForSecretInput = vi.fn().mockResolvedValueOnce('').mockResolvedValueOnce('good-key');
    const ui = createUi({ promptForSecretInput });

    await resolveAgentRuntimeIntegration(createClient(), ui, createOptions(), 'claude', 'env-1');

    expect(promptForSecretInput).toHaveBeenCalledTimes(2);
    expect(promptForSecretInput.mock.calls[1][0]).toMatchObject({
      verificationError: expect.stringContaining('Enter all required credential fields'),
    });
    expect(verifyManagedCredentials).toHaveBeenCalledTimes(1);
    expect(verifyManagedCredentials.mock.calls[0][1]).toMatchObject({ apiKey: 'good-key' });
  });

  it('re-prompts all AWS Claude credential fields after verification fails', async () => {
    const promptForSecretInput = vi
      .fn()
      .mockResolvedValueOnce('bad-key')
      .mockResolvedValueOnce('wrkspc_test')
      .mockResolvedValueOnce('good-key')
      .mockResolvedValueOnce('wrkspc_test');
    const pickAwsClaudeRegion = vi.fn().mockResolvedValue('us-east-1');
    const ui = createUi({ promptForSecretInput, pickAwsClaudeRegion });
    createAgentRuntimeIntegration.mockResolvedValue({
      _id: 'integration-aws-1',
      identifier: 'connect-aws-claude',
      name: 'Novu Connect AWS Claude',
      providerId: AgentRuntimeProviderIdEnum.AnthropicAws,
    });
    verifyManagedCredentials
      .mockRejectedValueOnce(
        new NovuApiError('Invalid workspace', 401, 'POST http://localhost/v1/agents/verify-credentials', null)
      )
      .mockResolvedValueOnce(undefined);

    const result = await resolveAgentRuntimeIntegration(createClient(), ui, createOptions(), 'claude-aws', 'env-1');

    expect(pickAwsClaudeRegion).toHaveBeenCalledTimes(2);
    expect(promptForSecretInput).toHaveBeenCalledTimes(4);
    expect(promptForSecretInput.mock.calls[2][0]).toMatchObject({
      title: 'AWS Claude API key',
      verificationError: expect.stringContaining('Invalid workspace'),
    });
    expect(promptForSecretInput.mock.calls[3][0]).toMatchObject({
      title: 'AWS Claude workspace ID',
      verificationError: expect.stringContaining('Invalid workspace'),
    });
    expect(verifyManagedCredentials).toHaveBeenCalledTimes(2);
    expect(result.integrationId).toBe('integration-aws-1');
  });

  it('does not retry credential verification in CI mode', async () => {
    const ui = createUi();
    verifyManagedCredentials.mockRejectedValue(
      new NovuApiError('Invalid API key', 401, 'POST http://localhost/v1/agents/verify-credentials', null)
    );

    await expect(
      resolveAgentRuntimeIntegration(
        createClient(),
        ui,
        createOptions({ ci: true, anthropicApiKey: 'bad-key' }),
        'claude',
        'env-1'
      )
    ).rejects.toThrow(/Invalid API key/);

    expect(verifyManagedCredentials).toHaveBeenCalledTimes(1);
    expect(ui.promptForSecretInput).not.toHaveBeenCalled();
  });
});
