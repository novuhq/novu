import type { CardElement } from 'chat';
import { buildHumanDashboardUrl } from '../shared/helpers/resolve-human-dashboard-base-url';

export function resolveConnectClaimBaseUrl(): string {
  for (const candidate of [process.env.DASHBOARD_URL, process.env.FRONT_BASE_URL]) {
    const trimmed = candidate?.trim();

    // Some deployments store CORS-style regex patterns in these vars; skip them for URL building.
    if (!trimmed || trimmed.startsWith('^')) {
      continue;
    }

    return trimmed.replace(/\/$/, '');
  }

  return 'https://dashboard.novu.co';
}

export function buildConnectClaimUrl(token: string): string {
  return `${resolveConnectClaimBaseUrl()}/connect/claim?token=${encodeURIComponent(token)}`;
}

/**
 * Human keyless setups are claimed on the Human dashboard when one is configured,
 * and on the dashboard otherwise (self-hosted, or before the website is live).
 */
export function buildHumanClaimUrl(token: string): string {
  if (!process.env.HUMAN_DASHBOARD_URL?.trim()) {
    return buildConnectClaimUrl(token);
  }

  return buildHumanDashboardUrl('/claim', { token });
}

export function buildKeylessWelcomeCard(welcomeText: string, claimUrl: string): CardElement {
  return {
    type: 'card',
    children: [
      { type: 'text', content: welcomeText },
      {
        type: 'text',
        content: 'This is a free demo — sign up anytime to keep this agent and your conversation.',
      },
      {
        type: 'actions',
        children: [
          {
            type: 'link-button',
            label: 'Sign up free',
            url: claimUrl,
            style: 'primary',
          },
        ],
      },
    ],
  };
}

export function buildKeylessSignupCard(claimUrl: string): CardElement {
  return {
    type: 'card',
    children: [
      {
        type: 'text',
        content:
          "You've reached the limit of this free demo. Sign up for a free Novu account to keep this agent — your " +
          'conversation and setup carry over, and the agent picks up right where it left off.',
      },
      { type: 'divider' },
      {
        type: 'actions',
        children: [
          {
            type: 'link-button',
            label: 'Sign up & keep this agent',
            url: claimUrl,
            style: 'primary',
          },
        ],
      },
    ],
  };
}

/**
 * Sent on the human's linked channel *instead of* the agent's message once a
 * keyless `@novu/human` environment hits its interaction cap.
 */
/**
 * The only outbound email a keyless inbox sends: a reply to the owner telling
 * them to claim the setup. Inbound replies from the agent never follow it.
 */
export function buildKeylessEmailClaimCard(claimUrl: string): CardElement {
  return {
    type: 'card',
    children: [
      {
        type: 'text',
        content:
          'This inbox can receive email, but it cannot send any until you claim this setup. Claiming it is free.',
      },
      {
        type: 'text',
        content:
          'Your agent can then email the people you invite — 50 a day and 300 a month. The five-message demo cap is lifted. Your agents, channels, and contacts move into an account you own and can reach from any machine.',
      },
      { type: 'divider' },
      {
        type: 'actions',
        children: [
          {
            type: 'link-button',
            label: 'Sign up free',
            url: claimUrl,
            style: 'primary',
          },
        ],
      },
    ],
  };
}

export function buildKeylessHumanSignupCard(claimUrl: string): CardElement {
  return {
    type: 'card',
    children: [
      {
        type: 'text',
        content:
          "You've reached the limit of this free `human` demo. Sign up for a free Novu account to keep this " +
          'channel and your setup — your agents pick up right where they left off.',
      },
      { type: 'divider' },
      {
        type: 'actions',
        children: [
          {
            type: 'link-button',
            label: 'Sign up & keep this setup',
            url: claimUrl,
            style: 'primary',
          },
        ],
      },
    ],
  };
}
