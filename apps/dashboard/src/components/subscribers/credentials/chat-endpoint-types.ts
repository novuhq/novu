import type { ChannelEndpointType } from '@novu/shared';
import { ChatProviderIdEnum, ENDPOINT_TYPES, ToolProviderIdEnum } from '@novu/shared';
import type { IconType } from 'react-icons';
import { RiAtLine, RiHashtag, RiKey2Line, RiLinksLine, RiTelegramLine } from 'react-icons/ri';

/** A chat endpoint type a user can manually add for an integration. */
export type ChatEndpointTypeOption = {
  type: ChannelEndpointType;
  label: string;
  icon: IconType;
  /** Empty payload skeleton whose keys seed the add form's labeled fields. */
  skeleton: Record<string, string>;
  /** Token-based types (Slack/Teams channel & user) only deliver when linked to an OAuth connection. */
  requiresConnection: boolean;
};

const WEBHOOK: ChatEndpointTypeOption = {
  type: ENDPOINT_TYPES.WEBHOOK,
  label: 'Webhook',
  icon: RiLinksLine,
  skeleton: { url: '' },
  requiresConnection: false,
};

/** Webhook variant for providers that route by channel/room (Mattermost, Rocket.Chat). */
const WEBHOOK_WITH_CHANNEL: ChatEndpointTypeOption = {
  type: ENDPOINT_TYPES.WEBHOOK,
  label: 'Webhook',
  icon: RiLinksLine,
  skeleton: { url: '', channel: '' },
  requiresConnection: false,
};

const SLACK_CHANNEL: ChatEndpointTypeOption = {
  type: ENDPOINT_TYPES.SLACK_CHANNEL,
  label: 'Slack channel',
  icon: RiHashtag,
  skeleton: { channelId: '' },
  requiresConnection: true,
};

const SLACK_USER: ChatEndpointTypeOption = {
  type: ENDPOINT_TYPES.SLACK_USER,
  label: 'Slack user',
  icon: RiAtLine,
  skeleton: { userId: '' },
  requiresConnection: true,
};

const MS_TEAMS_CHANNEL: ChatEndpointTypeOption = {
  type: ENDPOINT_TYPES.MS_TEAMS_CHANNEL,
  label: 'Teams channel',
  icon: RiHashtag,
  skeleton: { teamId: '', channelId: '' },
  requiresConnection: true,
};

const MS_TEAMS_USER: ChatEndpointTypeOption = {
  type: ENDPOINT_TYPES.MS_TEAMS_USER,
  label: 'Teams user',
  icon: RiAtLine,
  skeleton: { userId: '' },
  requiresConnection: true,
};

const WEBEX_ROOM: ChatEndpointTypeOption = {
  type: ENDPOINT_TYPES.WEBEX_ROOM,
  label: 'Webex room',
  icon: RiHashtag,
  skeleton: { roomId: '' },
  requiresConnection: true,
};

const WEBEX_PERSON: ChatEndpointTypeOption = {
  type: ENDPOINT_TYPES.WEBEX_PERSON,
  label: 'Webex person',
  icon: RiAtLine,
  skeleton: { personEmail: '' },
  requiresConnection: true,
};

const TELEGRAM_CHAT: ChatEndpointTypeOption = {
  type: ENDPOINT_TYPES.TELEGRAM_CHAT,
  label: 'Telegram chat',
  icon: RiTelegramLine,
  skeleton: { chatId: '' },
  requiresConnection: false,
};

const LINE_USER: ChatEndpointTypeOption = {
  type: ENDPOINT_TYPES.LINE_USER,
  label: 'LINE user',
  icon: RiAtLine,
  skeleton: { userId: '' },
  requiresConnection: false,
};

const CONNECT_LINK_PROVIDERS = new Set<string>([
  ChatProviderIdEnum.Slack,
  ChatProviderIdEnum.MsTeams,
  ChatProviderIdEnum.WebexMessaging,
  ChatProviderIdEnum.Telegram,
]);

export function supportsConnectLink(providerId: string): boolean {
  return CONNECT_LINK_PROVIDERS.has(providerId);
}

/**
 * Endpoint types each chat provider actually consumes, mirroring the provider `sendMessage`
 * implementations in `packages/providers/src/lib/chat`. Providers not listed fall back to a
 * plain webhook. WhatsApp Business (phone-only) is handled separately in the UI.
 */
const SUPPORTED_TYPES_BY_PROVIDER: Partial<Record<string, ChatEndpointTypeOption[]>> = {
  [ChatProviderIdEnum.Slack]: [WEBHOOK, SLACK_CHANNEL, SLACK_USER],
  [ChatProviderIdEnum.MsTeams]: [WEBHOOK, MS_TEAMS_CHANNEL, MS_TEAMS_USER],
  [ChatProviderIdEnum.WebexMessaging]: [WEBEX_ROOM, WEBEX_PERSON],
  [ChatProviderIdEnum.Telegram]: [TELEGRAM_CHAT],
  [ChatProviderIdEnum.Line]: [LINE_USER],
  [ChatProviderIdEnum.Discord]: [WEBHOOK],
  [ChatProviderIdEnum.Mattermost]: [WEBHOOK_WITH_CHANNEL],
  [ChatProviderIdEnum.Ryver]: [WEBHOOK],
  [ChatProviderIdEnum.Zulip]: [WEBHOOK],
  [ChatProviderIdEnum.GetStream]: [WEBHOOK],
  [ChatProviderIdEnum.RocketChat]: [WEBHOOK_WITH_CHANNEL],
  [ChatProviderIdEnum.GrafanaOnCall]: [WEBHOOK],
  [ChatProviderIdEnum.ChatWebhook]: [WEBHOOK],
};

/**
 * Resolves the endpoint types a user may manually add for a chat integration.
 * Only types the provider actually supports are offered; connection-based types
 * (Slack/Teams channel & user) are hidden unless an OAuth connection exists.
 */
export function getAddableEndpointTypes(providerId: string, hasConnection: boolean): ChatEndpointTypeOption[] {
  const supported = SUPPORTED_TYPES_BY_PROVIDER[providerId] ?? [WEBHOOK];

  return supported.filter((option) => !option.requiresConnection || hasConnection);
}

const PAGERDUTY_SERVICE: ChatEndpointTypeOption = {
  type: ENDPOINT_TYPES.PAGERDUTY_SERVICE,
  label: 'PagerDuty service',
  icon: RiKey2Line,
  skeleton: { routingKey: '', region: 'us' },
  requiresConnection: false,
};

/**
 * Endpoint types each tool provider consumes for per-subscriber routing.
 * Credential-routed tools (Opsgenie, tool webhook) have no subscriber endpoints.
 */
const SUPPORTED_TOOL_TYPES_BY_PROVIDER: Partial<Record<string, ChatEndpointTypeOption[]>> = {
  [ToolProviderIdEnum.PagerDuty]: [PAGERDUTY_SERVICE],
};

/** Resolves endpoint types a user may manually add for a tool integration. */
export function getAddableToolEndpointTypes(providerId: string): ChatEndpointTypeOption[] {
  return SUPPORTED_TOOL_TYPES_BY_PROVIDER[providerId] ?? [];
}
