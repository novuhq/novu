import { SubscriberResponseDto } from '@novu/api/models/components';
import type { ChannelEndpointType, IIntegration } from '@novu/shared';
import { ChannelTypeEnum, ChatProviderIdEnum, providers } from '@novu/shared';
import type { ChannelConnectionDto } from '@/api/channel-connections';
import type { ChannelEndpointDto, ChannelEndpointPayload } from '@/api/channel-endpoints';
import { type ChatEndpointTypeOption, getAddableEndpointTypes } from './chat-endpoint-types';

export type EditableCredentialRow = {
  id: string;
  kind: 'editable';
  channel: ChannelTypeEnum;
  providerId: string;
  displayName: string;
  integrationIdentifier?: string;
  /** Push device tokens for the integration. */
  values: string[];
};

export type OverviewField = 'email' | 'phone';

export type ReadonlyCredentialRow = {
  id: string;
  kind: 'readonly';
  channel: ChannelTypeEnum;
  providerId: string;
  displayName: string;
  /** The subscriber's email or phone. Empty string when not set. */
  value: string;
  /** The Overview form field this credential maps to. */
  overviewField: OverviewField;
  /** When set, the value is rendered as a JSON object (e.g. `{ "phone": "..." }`). */
  jsonKey?: string;
  /** Hides the per-provider icon/name header, rendering a single generic value row (email/SMS). */
  hideProviderHeader?: boolean;
};

/**
 * A single chat credential, unified into the endpoint (JSON payload) shape regardless
 * of whether it is backed by a legacy webhook credential or a modern channel endpoint.
 */
export type ChatCredentialItem =
  | {
      id: string;
      source: 'webhook';
      providerId: string;
      displayName: string;
      integrationIdentifier: string;
      /** Legacy webhook mapped to the endpoint shape. */
      payload: { url: string; channel?: string };
    }
  | {
      id: string;
      source: 'endpoint';
      providerId: string;
      displayName: string;
      integrationIdentifier: string;
      endpointIdentifier: string;
      endpointType: ChannelEndpointType;
      connectionIdentifier?: string;
      payload: ChannelEndpointPayload;
    };

/** A chat integration and all of its credentials (legacy webhook + endpoints) as unified items. */
export type ChatIntegrationRow = {
  id: string;
  kind: 'chatIntegration';
  channel: ChannelTypeEnum;
  providerId: string;
  displayName: string;
  integrationIdentifier: string;
  items: ChatCredentialItem[];
  /** Endpoint types the user may manually add for this integration. Empty when adding is unavailable. */
  addableTypes: ChatEndpointTypeOption[];
  /** Connection to attach when adding a token-based endpoint type. */
  connectionIdentifier?: string;
};

export type CredentialRow = EditableCredentialRow | ReadonlyCredentialRow | ChatIntegrationRow;

export type ChannelGroup = {
  channel: ChannelTypeEnum;
  label: string;
  rows: CredentialRow[];
};

type StoredChannel = {
  providerId?: string;
  integrationIdentifier?: string;
  _integrationId?: string;
  credentials?: {
    deviceTokens?: string[];
    webhookUrl?: string;
    channel?: string;
    phoneNumber?: string;
  };
};

const CHANNEL_LABELS: Record<ChannelTypeEnum, string> = {
  [ChannelTypeEnum.IN_APP]: 'IN-APP',
  [ChannelTypeEnum.EMAIL]: 'EMAIL',
  [ChannelTypeEnum.SMS]: 'SMS',
  [ChannelTypeEnum.CHAT]: 'CHAT',
  [ChannelTypeEnum.PUSH]: 'PUSH',
};

/** Section order, following the Figma layout (email, sms, push, chat). */
const GROUP_ORDER: ChannelTypeEnum[] = [
  ChannelTypeEnum.EMAIL,
  ChannelTypeEnum.SMS,
  ChannelTypeEnum.PUSH,
  ChannelTypeEnum.CHAT,
];

function getProviderDisplayName(providerId: string): string {
  return providers.find((provider) => provider.id === providerId)?.displayName ?? providerId;
}

function isWhatsApp(providerId: string): boolean {
  return providerId === ChatProviderIdEnum.WhatsAppBusiness;
}

function getActiveIntegrationsByChannel(integrations: IIntegration[], channel: ChannelTypeEnum): IIntegration[] {
  return integrations.filter(
    (integration) => integration.active && !integration.deleted && integration.channel === channel
  );
}

function findStoredChannelForIntegration(
  integration: IIntegration,
  storedChannels: StoredChannel[]
): StoredChannel | undefined {
  return (
    storedChannels.find(
      (channel) => !!channel.integrationIdentifier && channel.integrationIdentifier === integration.identifier
    ) ??
    storedChannels.find((channel) => !!channel._integrationId && channel._integrationId === integration._id) ??
    storedChannels.find((channel) => channel.providerId === integration.providerId)
  );
}

/** Builds an editable row for a push integration, joined with any stored device tokens. */
function buildEditableIntegrationRow(
  integration: IIntegration,
  storedChannels: StoredChannel[]
): EditableCredentialRow {
  const storedChannel = findStoredChannelForIntegration(integration, storedChannels);

  return {
    id: `${integration.providerId}:${integration.identifier}`,
    kind: 'editable',
    channel: integration.channel as ChannelTypeEnum,
    providerId: integration.providerId,
    displayName: integration.name || getProviderDisplayName(integration.providerId),
    integrationIdentifier: integration.identifier,
    values: storedChannel?.credentials?.deviceTokens ?? [],
  };
}

function buildWebhookItem(integration: IIntegration, storedChannels: StoredChannel[]): ChatCredentialItem | null {
  const storedChannel = findStoredChannelForIntegration(integration, storedChannels);
  const url = storedChannel?.credentials?.webhookUrl;
  const channel = storedChannel?.credentials?.channel;

  if (!url && !channel) {
    return null;
  }

  return {
    id: `webhook:${integration.identifier}`,
    source: 'webhook',
    providerId: integration.providerId,
    displayName: integration.name || getProviderDisplayName(integration.providerId),
    integrationIdentifier: integration.identifier,
    payload: { url: url ?? '', ...(channel ? { channel } : {}) },
  };
}

function buildEndpointItem(dto: ChannelEndpointDto, integration?: IIntegration): ChatCredentialItem {
  const providerId = integration?.providerId ?? dto.providerId ?? '';

  return {
    id: `endpoint:${dto.identifier}`,
    source: 'endpoint',
    providerId,
    displayName: integration?.name || getProviderDisplayName(providerId),
    integrationIdentifier: dto.integrationIdentifier ?? integration?.identifier ?? '',
    endpointIdentifier: dto.identifier,
    endpointType: dto.type,
    connectionIdentifier: dto.connectionIdentifier ?? undefined,
    payload: dto.endpoint,
  };
}

function buildReadonlyRows(
  integrations: IIntegration[],
  value: string,
  overviewField: OverviewField,
  jsonKey?: string
): ReadonlyCredentialRow[] {
  return integrations.map((integration) => ({
    id: `${integration.providerId}:${integration.identifier}`,
    kind: 'readonly',
    channel: integration.channel as ChannelTypeEnum,
    providerId: integration.providerId,
    displayName: integration.name || getProviderDisplayName(integration.providerId),
    value,
    overviewField,
    jsonKey,
  }));
}

function buildChatGroup(
  integrations: IIntegration[],
  storedChannels: StoredChannel[],
  channelEndpoints: ChannelEndpointDto[],
  channelConnections: ChannelConnectionDto[],
  phone: string
): ChannelGroup {
  const chatIntegrations = getActiveIntegrationsByChannel(integrations, ChannelTypeEnum.CHAT);
  const chatEndpoints = channelEndpoints.filter(
    (endpoint) => !endpoint.channel || endpoint.channel === ChannelTypeEnum.CHAT
  );

  const rows: CredentialRow[] = [];
  const consumedEndpoints = new Set<string>();

  for (const integration of chatIntegrations.filter((integration) => !isWhatsApp(integration.providerId))) {
    const items: ChatCredentialItem[] = [];
    const webhookItem = buildWebhookItem(integration, storedChannels);

    if (webhookItem) {
      items.push(webhookItem);
    }

    for (const endpoint of chatEndpoints.filter(
      (endpoint) => endpoint.integrationIdentifier === integration.identifier
    )) {
      items.push(buildEndpointItem(endpoint, integration));
      consumedEndpoints.add(endpoint.identifier);
    }

    const connection = channelConnections.find(
      (candidate) => candidate.integrationIdentifier === integration.identifier
    );

    rows.push({
      id: `chat:${integration.providerId}:${integration.identifier}`,
      kind: 'chatIntegration',
      channel: ChannelTypeEnum.CHAT,
      providerId: integration.providerId,
      displayName: integration.name || getProviderDisplayName(integration.providerId),
      integrationIdentifier: integration.identifier,
      items,
      addableTypes: getAddableEndpointTypes(integration.providerId, !!connection),
      connectionIdentifier: connection?.identifier,
    });
  }

  const whatsAppRows = buildReadonlyRows(
    chatIntegrations.filter((integration) => isWhatsApp(integration.providerId)),
    phone,
    'phone',
    'phone'
  );
  rows.push(...whatsAppRows);

  // Endpoints whose integration is not an active chat integration still get their own card.
  const orphanEndpoints = chatEndpoints.filter((endpoint) => !consumedEndpoints.has(endpoint.identifier));
  const orphanGroups = new Map<string, ChannelEndpointDto[]>();

  for (const endpoint of orphanEndpoints) {
    const key = endpoint.integrationIdentifier ?? endpoint.identifier;
    orphanGroups.set(key, [...(orphanGroups.get(key) ?? []), endpoint]);
  }

  for (const [key, endpoints] of orphanGroups) {
    const [first] = endpoints;
    const providerId = first.providerId ?? '';

    rows.push({
      id: `chat-orphan:${key}`,
      kind: 'chatIntegration',
      channel: ChannelTypeEnum.CHAT,
      providerId,
      displayName: getProviderDisplayName(providerId),
      integrationIdentifier: first.integrationIdentifier ?? '',
      items: endpoints.map((endpoint) => buildEndpointItem(endpoint)),
      addableTypes: [],
    });
  }

  return {
    channel: ChannelTypeEnum.CHAT,
    label: CHANNEL_LABELS[ChannelTypeEnum.CHAT],
    rows,
  };
}

/**
 * Builds a single generic value row (email/SMS) instead of one row per provider integration.
 * The row is only produced when at least one active integration for the channel exists.
 */
function buildSingleValueRows(
  integrations: IIntegration[],
  channel: ChannelTypeEnum,
  value: string,
  overviewField: OverviewField
): ReadonlyCredentialRow[] {
  if (getActiveIntegrationsByChannel(integrations, channel).length === 0) {
    return [];
  }

  return [
    {
      id: overviewField,
      kind: 'readonly',
      channel,
      providerId: '',
      displayName: overviewField === 'email' ? 'Email' : 'Phone',
      value,
      overviewField,
      hideProviderHeader: true,
    },
  ];
}

type BuildCredentialGroupsArgs = {
  subscriber: SubscriberResponseDto;
  integrations: IIntegration[];
  channelEndpoints?: ChannelEndpointDto[];
  channelConnections?: ChannelConnectionDto[];
};

export function buildCredentialGroups({
  subscriber,
  integrations,
  channelEndpoints = [],
  channelConnections = [],
}: BuildCredentialGroupsArgs): ChannelGroup[] {
  const storedChannels = (subscriber.channels ?? []) as unknown as StoredChannel[];
  const email = subscriber.email ?? '';
  const phone = subscriber.phone ?? '';

  const groups: ChannelGroup[] = GROUP_ORDER.map((channel) => {
    if (channel === ChannelTypeEnum.PUSH) {
      return {
        channel,
        label: CHANNEL_LABELS[channel],
        rows: getActiveIntegrationsByChannel(integrations, ChannelTypeEnum.PUSH).map((integration) =>
          buildEditableIntegrationRow(integration, storedChannels)
        ),
      };
    }

    if (channel === ChannelTypeEnum.CHAT) {
      return buildChatGroup(integrations, storedChannels, channelEndpoints, channelConnections, phone);
    }

    const value = channel === ChannelTypeEnum.EMAIL ? email : phone;
    const overviewField: OverviewField = channel === ChannelTypeEnum.EMAIL ? 'email' : 'phone';

    return {
      channel,
      label: CHANNEL_LABELS[channel],
      rows: buildSingleValueRows(integrations, channel, value, overviewField),
    };
  });

  return groups.filter((group) => group.rows.length > 0);
}
