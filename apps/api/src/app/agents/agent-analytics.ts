import type { AnalyticsService } from '@novu/application-generic';

const AGENT_SEGMENT_CATEGORY = '[Agents]';

export function trackAgentCreated(
  analytics: AnalyticsService,
  params: {
    userId: string;
    organizationId: string;
    environmentId: string;
    agentId: string;
    agentIdentifier: string;
    active: boolean;
    name: string;
  }
): void {
  analytics.track(`Agent Created - ${AGENT_SEGMENT_CATEGORY}`, params.userId, {
    _organization: params.organizationId,
    environmentId: params.environmentId,
    agentId: params.agentId,
    agentIdentifier: params.agentIdentifier,
    active: params.active,
    name: params.name,
  });
}

export function trackAgentIntegrationConnected(
  analytics: AnalyticsService,
  params: {
    userId: string;
    organizationId: string;
    environmentId: string;
    agentId: string;
    agentIdentifier: string;
    integrationId: string;
    integrationIdentifier: string;
    providerId: string;
    channel: string;
    connectionSource: 'existing_integration' | 'novu_email_provisioned';
  }
): void {
  analytics.track(`Agent Integration Connected - ${AGENT_SEGMENT_CATEGORY}`, params.userId, {
    _organization: params.organizationId,
    environmentId: params.environmentId,
    agentId: params.agentId,
    agentIdentifier: params.agentIdentifier,
    integrationId: params.integrationId,
    integrationIdentifier: params.integrationIdentifier,
    providerId: params.providerId,
    channel: params.channel,
    connectionSource: params.connectionSource,
  });
}

export function trackAgentInboundMessage(
  analytics: AnalyticsService,
  params: {
    organizationId: string;
    environmentId: string;
    agentId: string;
    agentIdentifier: string;
    integrationIdentifier: string;
    platform: string;
    conversationId: string;
    agentEvent: string;
    isFirstMessageInThread: boolean;
  }
): void {
  analytics.track(`Agent Inbound Message Processed - ${AGENT_SEGMENT_CATEGORY}`, params.organizationId, {
    _organization: params.organizationId,
    environmentId: params.environmentId,
    agentId: params.agentId,
    agentIdentifier: params.agentIdentifier,
    integrationIdentifier: params.integrationIdentifier,
    platform: params.platform,
    conversationId: params.conversationId,
    agentEvent: params.agentEvent,
    isFirstMessageInThread: params.isFirstMessageInThread,
  });
}

export function trackAgentInboundReaction(
  analytics: AnalyticsService,
  params: {
    organizationId: string;
    environmentId: string;
    agentId: string;
    agentIdentifier: string;
    integrationIdentifier: string;
    platform: string;
    conversationId: string;
  }
): void {
  analytics.track(`Agent Inbound Reaction Processed - ${AGENT_SEGMENT_CATEGORY}`, params.organizationId, {
    _organization: params.organizationId,
    environmentId: params.environmentId,
    agentId: params.agentId,
    agentIdentifier: params.agentIdentifier,
    integrationIdentifier: params.integrationIdentifier,
    platform: params.platform,
    conversationId: params.conversationId,
  });
}

export function trackAgentInboundAction(
  analytics: AnalyticsService,
  params: {
    organizationId: string;
    environmentId: string;
    agentId: string;
    agentIdentifier: string;
    integrationIdentifier: string;
    platform: string;
    conversationId: string;
    actionId: string;
  }
): void {
  analytics.track(`Agent Inbound Action Processed - ${AGENT_SEGMENT_CATEGORY}`, params.organizationId, {
    _organization: params.organizationId,
    environmentId: params.environmentId,
    agentId: params.agentId,
    agentIdentifier: params.agentIdentifier,
    integrationIdentifier: params.integrationIdentifier,
    platform: params.platform,
    conversationId: params.conversationId,
    actionId: params.actionId,
  });
}

export function trackAgentReplyProcessed(
  analytics: AnalyticsService,
  params: {
    userId: string;
    organizationId: string;
    environmentId: string;
    agentIdentifier: string;
    conversationId: string;
    integrationIdentifier: string;
    actions: string[];
    triggerSignalCount: number;
    metadataSignalCount: number;
    reactionCount: number;
  }
): void {
  analytics.track(`Agent Reply Processed - ${AGENT_SEGMENT_CATEGORY}`, params.userId, {
    _organization: params.organizationId,
    environmentId: params.environmentId,
    agentIdentifier: params.agentIdentifier,
    conversationId: params.conversationId,
    integrationIdentifier: params.integrationIdentifier,
    actions: params.actions,
    triggerSignalCount: params.triggerSignalCount,
    metadataSignalCount: params.metadataSignalCount,
    reactionCount: params.reactionCount,
  });
}

export function trackAgentDeleted(
  analytics: AnalyticsService,
  params: {
    userId: string;
    organizationId: string;
    environmentId: string;
    agentId: string;
    agentIdentifier: string;
  }
): void {
  analytics.track(`Agent Deleted - ${AGENT_SEGMENT_CATEGORY}`, params.userId, {
    _organization: params.organizationId,
    environmentId: params.environmentId,
    agentId: params.agentId,
    agentIdentifier: params.agentIdentifier,
  });
}

export function trackAgentIntegrationRemoved(
  analytics: AnalyticsService,
  params: {
    userId: string;
    organizationId: string;
    environmentId: string;
    agentIdentifier: string;
    agentIntegrationId: string;
  }
): void {
  analytics.track(`Agent Integration Removed - ${AGENT_SEGMENT_CATEGORY}`, params.userId, {
    _organization: params.organizationId,
    environmentId: params.environmentId,
    agentIdentifier: params.agentIdentifier,
    agentIntegrationId: params.agentIntegrationId,
  });
}

export function trackAgentTestEmailSent(
  analytics: AnalyticsService,
  params: {
    userId: string;
    organizationId: string;
    environmentId: string;
    agentIdentifier: string;
  }
): void {
  analytics.track(`Agent Test Email Sent - ${AGENT_SEGMENT_CATEGORY}`, params.userId, {
    _organization: params.organizationId,
    environmentId: params.environmentId,
    agentIdentifier: params.agentIdentifier,
  });
}

/** Fired once per agent–integration when the first inbound webhook is successfully resolved (sets connectedAt). */
export function trackAgentIntegrationFirstWebhook(
  analytics: AnalyticsService,
  params: {
    organizationId: string;
    environmentId: string;
    agentId: string;
    agentIdentifier: string;
    integrationIdentifier: string;
    platform: string;
  }
): void {
  analytics.track(`Agent Integration First Webhook - ${AGENT_SEGMENT_CATEGORY}`, params.organizationId, {
    _organization: params.organizationId,
    environmentId: params.environmentId,
    agentId: params.agentId,
    agentIdentifier: params.agentIdentifier,
    integrationIdentifier: params.integrationIdentifier,
    platform: params.platform,
  });
}
