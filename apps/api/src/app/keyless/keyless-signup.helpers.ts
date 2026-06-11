import type { CardElement } from 'chat';
import { AgentPlatformEnum } from '../agents/shared/enums/agent-platform.enum';

export function isKeylessOrganization(organizationId: string): boolean {
  const keylessOrganizationId = process.env.KEYLESS_ORGANIZATION_ID;

  return Boolean(keylessOrganizationId && organizationId === keylessOrganizationId);
}

export function resolveConnectClaimBaseUrl(): string {
  for (const candidate of [process.env.DASHBOARD_URL, process.env.FRONT_BASE_URL]) {
    const trimmed = candidate?.trim();

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

export function getKeylessWelcomeText(platform: AgentPlatformEnum): string {
  switch (platform) {
    case AgentPlatformEnum.SLACK:
      return 'Your Slack app is connected! Send me a message to try it out.';
    case AgentPlatformEnum.TEAMS:
      return 'Your Teams app is connected! Send me a message to try it out.';
    case AgentPlatformEnum.WHATSAPP:
      return 'Connected! Send me a message to try it out.';
    case AgentPlatformEnum.EMAIL:
      return 'Connected! Reply to this email to try it out.';
    default:
      return 'Connected! Send me a message to try it out.';
  }
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
        type: 'link',
        label: 'Sign up free',
        url: claimUrl,
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
