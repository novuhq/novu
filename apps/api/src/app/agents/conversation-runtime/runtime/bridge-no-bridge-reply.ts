import { buildSlug, shortenEnvironmentName } from '@novu/application-generic';
import { type AgentAnalyticsSource, ShortIsPrefixEnum } from '@novu/shared';
import type { CardChild, CardElement } from 'chat';

export const ONBOARDING_NO_BRIDGE_DASHBOARD_TEXT =
  "I'm live but running on defaults. Connect your agent in the dashboard to customize how I respond.";

export const ONBOARDING_NO_BRIDGE_CLI_TEXT =
  "I'm live but running on defaults. Continue the setup in your terminal to connect your agent and customize how I respond.";

export type NoBridgeReplyOptions = {
  creationSource?: AgentAnalyticsSource;
  dashboardUrl?: string;
};

export function isCliCreationSource(creationSource?: AgentAnalyticsSource): boolean {
  return creationSource === 'cli';
}

export function buildAgentDashboardOverviewUrl(params: {
  dashboardBase: string;
  environmentName: string;
  environmentId: string;
  agentIdentifier: string;
}): string {
  const shortEnvName = shortenEnvironmentName(params.environmentName);
  const environmentSlug = buildSlug(shortEnvName, ShortIsPrefixEnum.ENVIRONMENT, params.environmentId);

  return `${params.dashboardBase}/env/${environmentSlug}/agents/${params.agentIdentifier}/overview`;
}

export function buildNoBridgeReply(options: NoBridgeReplyOptions): { card: CardElement; content: string } {
  if (isCliCreationSource(options.creationSource)) {
    return {
      content: ONBOARDING_NO_BRIDGE_CLI_TEXT,
      card: {
        type: 'card',
        children: [{ type: 'text', content: ONBOARDING_NO_BRIDGE_CLI_TEXT }],
      },
    };
  }

  const children: CardChild[] = [{ type: 'text', content: ONBOARDING_NO_BRIDGE_DASHBOARD_TEXT }];

  if (options.dashboardUrl) {
    children.push(
      { type: 'divider' },
      {
        type: 'actions',
        children: [{ type: 'link-button', label: 'Continue setup', url: options.dashboardUrl, style: 'primary' }],
      }
    );
  }

  return {
    content: ONBOARDING_NO_BRIDGE_DASHBOARD_TEXT,
    card: { type: 'card', children },
  };
}
