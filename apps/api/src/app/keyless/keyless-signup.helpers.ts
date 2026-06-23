import type { CardElement } from 'chat';

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

export function toReplyCard(card: CardElement): Record<string, unknown> {
  return card as unknown as Record<string, unknown>;
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
