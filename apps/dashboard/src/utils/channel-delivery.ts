import { ChannelEndpointType, ENDPOINT_TYPES } from '@novu/shared';

type EndpointDisplayConfig = {
  label: string;
  primaryField: string;
  formatValue: (endpoint: Record<string, string>) => string;
};

const ENDPOINT_DISPLAY_MAP: Record<ChannelEndpointType, EndpointDisplayConfig> = {
  [ENDPOINT_TYPES.SLACK_CHANNEL]: {
    label: 'Slack channel',
    primaryField: 'channelId',
    formatValue: (ep) => `#${ep.channelId}`,
  },
  [ENDPOINT_TYPES.SLACK_USER]: {
    label: 'Slack DM',
    primaryField: 'userId',
    formatValue: (ep) => `@${ep.userId}`,
  },
  [ENDPOINT_TYPES.MS_TEAMS_CHANNEL]: {
    label: 'Teams channel',
    primaryField: 'channelId',
    formatValue: (ep) => ep.channelId,
  },
  [ENDPOINT_TYPES.MS_TEAMS_USER]: {
    label: 'Teams DM',
    primaryField: 'userId',
    formatValue: (ep) => `@${ep.userId}`,
  },
  [ENDPOINT_TYPES.TELEGRAM_CHAT]: {
    label: 'Telegram chat',
    primaryField: 'chatId',
    formatValue: (ep) => ep.chatId,
  },
  [ENDPOINT_TYPES.PHONE]: {
    label: 'Phone',
    primaryField: 'phoneNumber',
    formatValue: (ep) => ep.phoneNumber,
  },
  [ENDPOINT_TYPES.WEBHOOK]: {
    label: 'Webhook',
    primaryField: 'url',
    formatValue: (ep) => {
      const url = ep.url;
      if (url.length > 40) {
        return `${url.slice(0, 37)}...`;
      }

      return url;
    },
  },
};

export function getEndpointDisplayLabel(type: ChannelEndpointType): string {
  return ENDPOINT_DISPLAY_MAP[type]?.label ?? type;
}

export function getEndpointPrimaryValue(type: ChannelEndpointType, endpoint: Record<string, string>): string {
  const config = ENDPOINT_DISPLAY_MAP[type];
  if (!config) {
    return JSON.stringify(endpoint);
  }

  return config.formatValue(endpoint);
}

export function getConnectionModeLabel(mode: 'subscriber' | 'shared'): string {
  return mode === 'subscriber' ? 'Personal' : 'Shared';
}
