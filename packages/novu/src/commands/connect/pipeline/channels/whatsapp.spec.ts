import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConnectApiClient } from '../../api/client';
import type { AgentSummary, ConnectCommandOptions } from '../../types';
import type { ConnectUI } from '../../ui/ui';

const getWhatsAppEmbeddedSignupAvailability = vi.fn();
const getWhatsAppSignupStatus = vi.fn();
const createWhatsAppIntegration = vi.fn();
const resolveIntegrationForAgent = vi.fn();
const ensureAgentIntegrationLinked = vi.fn();
const pollForAgentLinkConnected = vi.fn();
const openMock = vi.fn();

vi.mock('open', () => ({
  default: (...args: unknown[]) => {
    openMock(...args);

    return Promise.resolve();
  },
}));

vi.mock('../../api/integrations', () => ({
  getWhatsAppEmbeddedSignupAvailability: (...args: unknown[]) => getWhatsAppEmbeddedSignupAvailability(...args),
  getWhatsAppSignupStatus: (...args: unknown[]) => getWhatsAppSignupStatus(...args),
  createWhatsAppIntegration: (...args: unknown[]) => createWhatsAppIntegration(...args),
}));

vi.mock('../integration-helpers', () => ({
  resolveIntegrationForAgent: (...args: unknown[]) => resolveIntegrationForAgent(...args),
  ensureAgentIntegrationLinked: (...args: unknown[]) => ensureAgentIntegrationLinked(...args),
  pollForAgentLinkConnected: (...args: unknown[]) => pollForAgentLinkConnected(...args),
}));

// Shrink the poll windows so timeout paths run in milliseconds.
vi.mock('../poll-until', async () => {
  const actual = await vi.importActual<typeof import('../poll-until')>('../poll-until');

  return {
    ...actual,
    CHANNEL_POLL_INTERVAL_MS: 1,
    CHANNEL_POLL_TIMEOUT_MS: 30,
    WHATSAPP_SIGNUP_POLL_TIMEOUT_MS: 30,
  };
});

import { connectWhatsAppForAgent } from './whatsapp';

const client = {} as ConnectApiClient;
const agent: AgentSummary = { id: 'agent-id', identifier: 'my-agent', name: 'My Agent' };
const options = { connectDashboardUrl: 'https://connect.novu.co' } as ConnectCommandOptions;
const environment = { environmentId: 'env-1', environmentSlug: 'dev-slug' };
const integration = {
  _id: 'integration-1',
  identifier: 'whatsapp-main',
  name: 'WhatsApp',
  providerId: 'whatsapp-business',
  channel: 'chat',
  active: true,
};

function createUi() {
  return {
    addingWhatsAppIntegration: vi.fn(),
    awaitWhatsAppSignupOpen: vi.fn().mockResolvedValue(undefined),
    showWhatsAppSignupWaiting: vi.fn(),
    showWhatsAppTest: vi.fn(),
    whatsappConnected: vi.fn(),
  } as unknown as ConnectUI & {
    addingWhatsAppIntegration: ReturnType<typeof vi.fn>;
    awaitWhatsAppSignupOpen: ReturnType<typeof vi.fn>;
    showWhatsAppSignupWaiting: ReturnType<typeof vi.fn>;
    showWhatsAppTest: ReturnType<typeof vi.fn>;
    whatsappConnected: ReturnType<typeof vi.fn>;
  };
}

describe('connectWhatsAppForAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveIntegrationForAgent.mockResolvedValue(integration);
    ensureAgentIntegrationLinked.mockResolvedValue(undefined);
  });

  it('returns unavailable without touching integrations when the pre-check says no', async () => {
    getWhatsAppEmbeddedSignupAvailability.mockResolvedValue({ available: false, reason: 'feature_disabled' });
    const ui = createUi();

    const result = await connectWhatsAppForAgent(client, agent, ui, options, environment, vi.fn());

    expect(result).toEqual({ kind: 'unavailable', reason: 'feature_disabled' });
    expect(resolveIntegrationForAgent).not.toHaveBeenCalled();
    expect(ui.addingWhatsAppIntegration).not.toHaveBeenCalled();
  });

  it('returns unavailable when the session has no environment slug', async () => {
    getWhatsAppEmbeddedSignupAvailability.mockResolvedValue({ available: true });
    const ui = createUi();

    const result = await connectWhatsAppForAgent(
      client,
      agent,
      ui,
      options,
      { environmentId: 'env-1', environmentSlug: null },
      vi.fn()
    );

    expect(result).toEqual({ kind: 'unavailable', reason: 'missing_environment_slug' });
    expect(resolveIntegrationForAgent).not.toHaveBeenCalled();
  });

  it('skips the browser handoff on re-runs when credentials are already saved', async () => {
    getWhatsAppEmbeddedSignupAvailability.mockResolvedValue({ available: true });
    getWhatsAppSignupStatus.mockResolvedValue({ credentialsSaved: true, displayPhoneNumber: '+1 555-123-4567' });
    pollForAgentLinkConnected.mockResolvedValue(true);
    const ui = createUi();
    const track = vi.fn();

    const result = await connectWhatsAppForAgent(client, agent, ui, options, environment, track);

    expect(result).toEqual({ kind: 'connected', connected: true, integration });
    expect(ui.awaitWhatsAppSignupOpen).not.toHaveBeenCalled();
    expect(openMock).not.toHaveBeenCalled();
    expect(ui.showWhatsAppTest).toHaveBeenCalledWith({
      waMeUrl: 'https://wa.me/15551234567',
      displayPhoneNumber: '+1 555-123-4567',
    });
    expect(ui.whatsappConnected).toHaveBeenCalled();
    expect(track).toHaveBeenCalledWith('Connect Whatsapp Connected', { agent: 'my-agent' });
  });

  it('opens the signup page and polls until credentials are saved', async () => {
    getWhatsAppEmbeddedSignupAvailability.mockResolvedValue({ available: true });
    getWhatsAppSignupStatus
      .mockResolvedValueOnce({ credentialsSaved: false })
      .mockResolvedValueOnce({ credentialsSaved: false })
      .mockResolvedValue({ credentialsSaved: true, displayPhoneNumber: '+1 555-123-4567' });
    pollForAgentLinkConnected.mockResolvedValue(true);
    const ui = createUi();
    const track = vi.fn();

    const result = await connectWhatsAppForAgent(client, agent, ui, options, environment, track);

    expect(result.kind).toBe('connected');
    const expectedSignupUrl =
      'https://connect.novu.co/env/dev-slug/agents/my-agent/whatsapp-signup?integration=whatsapp-main';
    expect(ui.awaitWhatsAppSignupOpen).toHaveBeenCalledWith({ signupUrl: expectedSignupUrl });
    expect(openMock).toHaveBeenCalledWith(expectedSignupUrl);
    expect(ui.showWhatsAppSignupWaiting).toHaveBeenCalledWith({ signupUrl: expectedSignupUrl });
    expect(track).toHaveBeenCalledWith('Connect Whatsapp Signup Opened', { agent: 'my-agent' });
    expect(track).toHaveBeenCalledWith('Connect Whatsapp Signup Completed', { agent: 'my-agent' });
  });

  it('throws a resumable error with the signup URL when signup times out', async () => {
    getWhatsAppEmbeddedSignupAvailability.mockResolvedValue({ available: true });
    getWhatsAppSignupStatus.mockResolvedValue({ credentialsSaved: false });
    const ui = createUi();
    const track = vi.fn();

    await expect(connectWhatsAppForAgent(client, agent, ui, options, environment, track)).rejects.toThrow(
      /whatsapp-signup\?integration=whatsapp-main/
    );
    expect(track).toHaveBeenCalledWith('Connect Whatsapp Signup Timed Out', { agent: 'my-agent' });
    expect(pollForAgentLinkConnected).not.toHaveBeenCalled();
  });

  it('throws a resumable error when no inbound message arrives after signup', async () => {
    getWhatsAppEmbeddedSignupAvailability.mockResolvedValue({ available: true });
    getWhatsAppSignupStatus.mockResolvedValue({ credentialsSaved: true, displayPhoneNumber: '+1 555-123-4567' });
    pollForAgentLinkConnected.mockResolvedValue(false);
    const ui = createUi();

    await expect(connectWhatsAppForAgent(client, agent, ui, options, environment, vi.fn())).rejects.toThrow(
      /\+1 555-123-4567/
    );
    expect(ui.whatsappConnected).not.toHaveBeenCalled();
  });
});
