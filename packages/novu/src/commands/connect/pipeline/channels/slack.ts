import open from 'open';
import { CONNECT_EVENTS } from '../../analytics/events';
import { getSlackSetupLinkStatus, issueSlackSetupLink } from '../../api/agents';
import type { ConnectApiClient } from '../../api/client';
import { NovuApiError } from '../../api/client';
import {
  countChannelConnectionsForIntegration,
  createSlackIntegration,
  generateConnectOauthUrl,
  type IntegrationRecord,
  slackQuickSetup,
} from '../../api/integrations';
import type { AgentSummary, ConnectCommandOptions } from '../../types';
import type { ConnectUI } from '../../ui/ui';
import { ensureAgentIntegrationLinked, resolveIntegrationForAgent } from '../integration-helpers';
import { CHANNEL_POLL_INTERVAL_MS, CHANNEL_POLL_TIMEOUT_MS, pollUntil } from '../poll-until';

const SLACK_PROVIDER_ID = 'slack';

export async function connectSlackForAgent(
  client: ConnectApiClient,
  agent: AgentSummary,
  ui: ConnectUI,
  options: ConnectCommandOptions,
  environmentId: string,
  subscriberId: string,
  track: (event: string, data?: Record<string, unknown>) => void
): Promise<{ connected: boolean; integration: IntegrationRecord }> {
  ui.addingSlackIntegration();

  const slackIntegration = await resolveIntegrationForAgent(client, agent, environmentId, {
    providerId: SLACK_PROVIDER_ID,
    create: createSlackIntegration,
  });

  await ensureAgentIntegrationLinked(client, agent.identifier, slackIntegration.identifier);

  const baselineConnections = await countChannelConnectionsForIntegration(client, slackIntegration.identifier);
  if (baselineConnections > 0) {
    ui.slackConnected();
    track(CONNECT_EVENTS.SLACK_CONNECTED, { agent: agent.identifier, alreadyConnected: true });

    return { connected: true, integration: slackIntegration };
  }

  const { authorizeUrl, appCreated } = await getAuthorizeUrlWithQuickSetupFallback(
    client,
    agent,
    slackIntegration,
    ui,
    options,
    subscriberId
  );

  await ui.awaitSlackOAuthOpen({ authorizeUrl, appCreated });
  track(CONNECT_EVENTS.SLACK_OAUTH_OPENED, { agent: agent.identifier, appCreated });
  void open(authorizeUrl).catch(() => undefined);
  ui.showSlackWaiting({ authorizeUrl });
  const connected = await pollUntil(
    async () => {
      const count = await countChannelConnectionsForIntegration(client, slackIntegration.identifier);

      return count > baselineConnections ? 'done' : 'pending';
    },
    { intervalMs: CHANNEL_POLL_INTERVAL_MS, timeoutMs: CHANNEL_POLL_TIMEOUT_MS }
  );
  if (!connected) {
    throw new Error(
      `Slack OAuth was not completed within ${Math.round(CHANNEL_POLL_TIMEOUT_MS / 1000)} seconds. ` +
        'Re-run `npx novu connect` once you have authorized the Slack app.'
    );
  }

  ui.slackConnected();
  track(CONNECT_EVENTS.SLACK_CONNECTED, { agent: agent.identifier, alreadyConnected: false });

  return { connected: true, integration: slackIntegration };
}

async function getAuthorizeUrlWithQuickSetupFallback(
  client: ConnectApiClient,
  agent: AgentSummary,
  slackIntegration: IntegrationRecord,
  ui: ConnectUI,
  options: ConnectCommandOptions,
  subscriberId: string
): Promise<{ authorizeUrl: string; appCreated: boolean }> {
  const buildUrl = () =>
    generateConnectOauthUrl(client, {
      integrationIdentifier: slackIntegration.identifier,
      agentIdentifier: agent.identifier,
      subscriberId,
    });

  try {
    const authorizeUrl = await buildUrl();

    return { authorizeUrl, appCreated: false };
  } catch (err) {
    if (!isMissingSlackCredentialsError(err)) throw err;

    await runSlackQuickSetup(client, agent, slackIntegration, ui, options, { retry: false });

    try {
      const authorizeUrl = await buildUrl();

      return { authorizeUrl, appCreated: true };
    } catch (retryErr) {
      if (!isMissingSlackCredentialsError(retryErr)) throw retryErr;

      await runSlackQuickSetup(client, agent, slackIntegration, ui, options, { retry: true });

      const authorizeUrl = await buildUrl();

      return { authorizeUrl, appCreated: true };
    }
  }
}

async function runSlackQuickSetup(
  client: ConnectApiClient,
  agent: AgentSummary,
  slackIntegration: IntegrationRecord,
  ui: ConnectUI,
  options: ConnectCommandOptions,
  _flags: { retry: boolean }
): Promise<void> {
  const configToken = options.slackConfigToken?.trim();

  if (configToken) {
    // Optional escape hatch for headless CI: the caller supplies the token directly.
    ui.runningSlackQuickSetup();
    await slackQuickSetup(client, slackIntegration._id, {
      configToken,
      agentId: agent.id,
    });

    return;
  }

  const setupLink = await issueSlackSetupLink(client, agent.identifier, slackIntegration._id);
  ui.showSlackSetupLink({ setupUrl: setupLink.url });

  let setupLinkFailure: 'expired' | 'invalid' | undefined;

  const tokenSaved = await pollUntil(
    async () => {
      const status = await getSlackSetupLinkStatus(client, setupLink.token);
      if (!status.valid && status.reason === 'used') return 'done';
      if (!status.valid && status.reason === 'expired') {
        setupLinkFailure = 'expired';

        return 'failed';
      }
      if (!status.valid) {
        setupLinkFailure = 'invalid';

        return 'failed';
      }

      return 'pending';
    },
    { intervalMs: CHANNEL_POLL_INTERVAL_MS, timeoutMs: CHANNEL_POLL_TIMEOUT_MS }
  );
  if (!tokenSaved) {
    if (setupLinkFailure === 'expired') {
      throw new Error(
        'The Slack setup link expired before you could paste your App Configuration Token. Re-run `npx novu connect` to get a fresh link.'
      );
    }
    if (setupLinkFailure === 'invalid') {
      throw new Error('The Slack setup link is no longer valid. Re-run `npx novu connect` to get a fresh link.');
    }

    throw new Error(
      `The Slack App Configuration Token wasn't saved within ${Math.round(CHANNEL_POLL_TIMEOUT_MS / 1000)} seconds. ` +
        'Re-run `npx novu connect` to get a fresh setup link.'
    );
  }
}

function isMissingSlackCredentialsError(err: unknown): boolean {
  if (!(err instanceof NovuApiError)) return false;
  if (err.status !== 404) return false;

  return /missing credentials/i.test(err.message);
}
