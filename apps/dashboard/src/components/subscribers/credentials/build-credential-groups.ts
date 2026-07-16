import { SubscriberResponseDto } from '@novu/api/models/components';
import type { ChannelEndpointType, IIntegration } from '@novu/shared';
import { ChannelTypeEnum, ChatProviderIdEnum, providers } from '@novu/shared';
import type { ChannelConnectionDto } from '@/api/channel-connections';
import type { ChannelEndpointDto, ChannelEndpointPayload } from '@/api/channel-endpoints';
import {
  type ChatEndpointTypeOption,
  getAddableEndpointTypes,
  getAddableToolEndpointTypes,
} from './chat-endpoint-types';

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
  [ChannelTypeEnum.TOOL]: 'TOOL',
};

/** Section order, following the Figma layout (email, sms, push, chat). Tool is appended when enabled. */
const GROUP_ORDER: ChannelTypeEnum[] = [
  ChannelTypeEnum.EMAIL,
  ChannelTypeEnum.SMS,
  ChannelTypeEnum.PUSH,
  ChannelTypeEnum.CHAT,
];

function getProviderDisplayName(providerId: string): string {
  return providers.find((provider) => provider.id === providerId)?.displayName ?? providerId;
}

/** Chat providers that deliver to the subscriber's phone number rather than a webhook/channel endpoint. */
const PHONE_BASED_CHAT_PROVIDERS = new Set<string>([ChatProviderIdEnum.WhatsAppBusiness, ChatProviderIdEnum.Sendblue]);

function isPhoneBasedChatProvider(providerId: string): boolean {
  return PHONE_BASED_CHAT_PROVIDERS.has(providerId);
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
  overviewField: OverviewField
): ReadonlyCredentialRow[] {
  return integrations.map((integration) => ({
    id: `${integration.providerId}:${integration.identifier}`,
    kind: 'readonly',
    channel: integration.channel as ChannelTypeEnum,
    providerId: integration.providerId,
    displayName: integration.name || getProviderDisplayName(integration.providerId),
    value,
    overviewField,
  }));
}

type EndpointIntegrationAddable = {
  addableTypes: ChatEndpointTypeOption[];
  connectionIdentifier?: string;
};

type CollectEndpointIntegrationRowsArgs = {
  channel: ChannelTypeEnum;
  idPrefix: string;
  integrations: IIntegration[];
  channelEndpoints: ChannelEndpointDto[];
  getAddable: (integration: IIntegration) => EndpointIntegrationAddable;
  prependItemsForIntegration?: (integration: IIntegration) => ChatCredentialItem[];
  /** Skip integrations that have neither stored credentials nor addable types. */
  skipEmptyNonAddable?: boolean;
};

/**
 * Shared builder for endpoint-backed integration cards (chat + tool): one card per
 * active integration, plus orphan endpoints whose integration is inactive/missing.
 */
function collectEndpointIntegrationRows({
  channel,
  idPrefix,
  integrations,
  channelEndpoints,
  getAddable,
  prependItemsForIntegration,
  skipEmptyNonAddable = false,
}: CollectEndpointIntegrationRowsArgs): {
  integrationRows: ChatIntegrationRow[];
  orphanRows: ChatIntegrationRow[];
} {
  const integrationRows: ChatIntegrationRow[] = [];
  const consumedEndpoints = new Set<string>();

  for (const integration of integrations) {
    const items: ChatCredentialItem[] = [...(prependItemsForIntegration?.(integration) ?? [])];

    for (const endpoint of channelEndpoints.filter(
      (endpoint) => endpoint.integrationIdentifier === integration.identifier
    )) {
      items.push(buildEndpointItem(endpoint, integration));
      consumedEndpoints.add(endpoint.identifier);
    }

    const { addableTypes, connectionIdentifier } = getAddable(integration);

    if (skipEmptyNonAddable && items.length === 0 && addableTypes.length === 0) {
      continue;
    }

    integrationRows.push({
      id: `${idPrefix}:${integration.providerId}:${integration.identifier}`,
      kind: 'chatIntegration',
      channel,
      providerId: integration.providerId,
      displayName: integration.name || getProviderDisplayName(integration.providerId),
      integrationIdentifier: integration.identifier,
      items,
      addableTypes,
      connectionIdentifier,
    });
  }

  const orphanEndpoints = channelEndpoints.filter((endpoint) => !consumedEndpoints.has(endpoint.identifier));
  const orphanGroups = new Map<string, ChannelEndpointDto[]>();

  for (const endpoint of orphanEndpoints) {
    const key = endpoint.integrationIdentifier ?? endpoint.identifier;
    orphanGroups.set(key, [...(orphanGroups.get(key) ?? []), endpoint]);
  }

  const orphanRows: ChatIntegrationRow[] = [];

  for (const [key, endpoints] of orphanGroups) {
    const [first] = endpoints;
    const providerId = first.providerId ?? '';

    orphanRows.push({
      id: `${idPrefix}-orphan:${key}`,
      kind: 'chatIntegration',
      channel,
      providerId,
      displayName: getProviderDisplayName(providerId),
      integrationIdentifier: first.integrationIdentifier ?? '',
      items: endpoints.map((endpoint) => buildEndpointItem(endpoint)),
      addableTypes: [],
    });
  }

  return { integrationRows, orphanRows };
}

function buildChatGroup(
  integrations: IIntegration[],
  storedChannels: StoredChannel[],
  channelEndpoints: ChannelEndpointDto[],
  channelConnections: ChannelConnectionDto[],
  phone: string
): ChannelGroup {
  const chatIntegrations = getActiveIntegrationsByChannel(integrations, ChannelTypeEnum.CHAT);
  // Null channel is legacy chat; exclude other channels when the list is unfiltered.
  const chatEndpoints = channelEndpoints.filter(
    (endpoint) => !endpoint.channel || endpoint.channel === ChannelTypeEnum.CHAT
  );

  const { integrationRows, orphanRows } = collectEndpointIntegrationRows({
    channel: ChannelTypeEnum.CHAT,
    idPrefix: 'chat',
    integrations: chatIntegrations.filter((integration) => !isPhoneBasedChatProvider(integration.providerId)),
    channelEndpoints: chatEndpoints,
    prependItemsForIntegration: (integration) => {
      const webhookItem = buildWebhookItem(integration, storedChannels);

      return webhookItem ? [webhookItem] : [];
    },
    getAddable: (integration) => {
      const connection = channelConnections.find(
        (candidate) => candidate.integrationIdentifier === integration.identifier
      );

      return {
        addableTypes: getAddableEndpointTypes(integration.providerId, !!connection),
        connectionIdentifier: connection?.identifier,
      };
    },
  });

  const phoneBasedRows = buildReadonlyRows(
    chatIntegrations.filter((integration) => isPhoneBasedChatProvider(integration.providerId)),
    phone,
    'phone'
  );

  return {
    channel: ChannelTypeEnum.CHAT,
    label: CHANNEL_LABELS[ChannelTypeEnum.CHAT],
    rows: [...integrationRows, ...phoneBasedRows, ...orphanRows],
  };
}

/** TOOL section for endpoint-routed tools (PagerDuty, Opsgenie). Credential-routed tools are omitted when empty. */
function buildToolGroup(integrations: IIntegration[], channelEndpoints: ChannelEndpointDto[]): ChannelGroup {
  const toolIntegrations = getActiveIntegrationsByChannel(integrations, ChannelTypeEnum.TOOL);
  const toolEndpoints = channelEndpoints.filter((endpoint) => endpoint.channel === ChannelTypeEnum.TOOL);

  const { integrationRows, orphanRows } = collectEndpointIntegrationRows({
    channel: ChannelTypeEnum.TOOL,
    idPrefix: 'tool',
    integrations: toolIntegrations,
    channelEndpoints: toolEndpoints,
    getAddable: (integration) => ({
      addableTypes: getAddableToolEndpointTypes(integration.providerId),
    }),
    skipEmptyNonAddable: true,
  });

  return {
    channel: ChannelTypeEnum.TOOL,
    label: CHANNEL_LABELS[ChannelTypeEnum.TOOL],
    rows: [...integrationRows, ...orphanRows],
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
  /** When true, appends the TOOL credentials section after chat. */
  includeToolChannel?: boolean;
};

export function buildCredentialGroups({
  subscriber,
  integrations,
  channelEndpoints = [],
  channelConnections = [],
  includeToolChannel = false,
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

  if (includeToolChannel) {
    groups.push(buildToolGroup(integrations, channelEndpoints));
  }

  return groups.filter((group) => group.rows.length > 0);
}
