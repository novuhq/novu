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
    channel?: string;
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

export function trackAgentMcpServerEnabled(
  analytics: AnalyticsService,
  params: {
    userId: string;
    organizationId: string;
    environmentId: string;
    agentId: string;
    agentIdentifier: string;
    mcpId: string;
    defaultScope: string;
    defaultAuthMode: string;
  }
): void {
  analytics.track(`Agent MCP Enabled - ${AGENT_SEGMENT_CATEGORY}`, params.userId, {
    _organization: params.organizationId,
    environmentId: params.environmentId,
    agentId: params.agentId,
    agentIdentifier: params.agentIdentifier,
    mcpId: params.mcpId,
    defaultScope: params.defaultScope,
    defaultAuthMode: params.defaultAuthMode,
  });
}

export function trackAgentMcpServerDisabled(
  analytics: AnalyticsService,
  params: {
    userId: string;
    organizationId: string;
    environmentId: string;
    agentId: string;
    agentIdentifier: string;
    mcpId: string;
  }
): void {
  analytics.track(`Agent MCP Disabled - ${AGENT_SEGMENT_CATEGORY}`, params.userId, {
    _organization: params.organizationId,
    environmentId: params.environmentId,
    agentId: params.agentId,
    agentIdentifier: params.agentIdentifier,
    mcpId: params.mcpId,
  });
}

export function trackAgentMcpOAuthCreated(
  analytics: AnalyticsService,
  params: {
    userId: string;
    organizationId: string;
    environmentId: string;
    agentId: string;
    agentIdentifier: string;
    mcpId: string;
    authMode: string;
    scope: string;
    subscriberId: string;
    source: 'api' | 'user_chat';
    conversationId?: string;
    reusedPendingSession?: boolean;
  }
): void {
  analytics.track(`Agent MCP OAuth Created - ${AGENT_SEGMENT_CATEGORY}`, params.userId, {
    _organization: params.organizationId,
    environmentId: params.environmentId,
    agentId: params.agentId,
    agentIdentifier: params.agentIdentifier,
    mcpId: params.mcpId,
    authMode: params.authMode,
    scope: params.scope,
    subscriberId: params.subscriberId,
    source: params.source,
    conversationId: params.conversationId,
    reusedPendingSession: params.reusedPendingSession,
  });
}

export function trackAgentMcpOAuthCompleted(
  analytics: AnalyticsService,
  params: {
    userId: string;
    organizationId: string;
    environmentId: string;
    agentId: string;
    mcpId: string;
    authMode: string;
    scope: string;
    connectionId: string;
    source?: string;
    conversationId?: string;
  }
): void {
  analytics.track(`Agent MCP OAuth Completed - ${AGENT_SEGMENT_CATEGORY}`, params.userId, {
    _organization: params.organizationId,
    environmentId: params.environmentId,
    agentId: params.agentId,
    mcpId: params.mcpId,
    authMode: params.authMode,
    scope: params.scope,
    connectionId: params.connectionId,
    source: params.source,
    conversationId: params.conversationId,
  });
}

export function trackAgentMcpOAuthFailed(
  analytics: AnalyticsService,
  params: {
    userId: string;
    organizationId: string;
    environmentId: string;
    agentId: string;
    mcpId: string;
    authMode?: string;
    scope: string;
    errorCode: string;
    source?: string;
    conversationId?: string;
  }
): void {
  analytics.track(`Agent MCP OAuth Failed - ${AGENT_SEGMENT_CATEGORY}`, params.userId, {
    _organization: params.organizationId,
    environmentId: params.environmentId,
    agentId: params.agentId,
    mcpId: params.mcpId,
    authMode: params.authMode,
    scope: params.scope,
    errorCode: params.errorCode,
    source: params.source,
    conversationId: params.conversationId,
  });
}

/**
 * Fired each time an active conversation is counted (one activation episode):
 * a new/reopened thread, a rolling-window lapse, or a new billing cycle. Gives
 * per-tier / per-channel conversation volume for pricing analysis. Org-scoped.
 */
export function trackAgentActiveConversationCounted(
  analytics: AnalyticsService,
  params: {
    organizationId: string;
    environmentId: string;
    agentId: string;
    conversationId: string;
    platform: string;
    threadKind: string;
    reason: string;
    periodKey: string;
    apiServiceLevel: string;
  }
): void {
  analytics.track(`Agent Active Conversation Counted - ${AGENT_SEGMENT_CATEGORY}`, params.organizationId, {
    _organization: params.organizationId,
    environmentId: params.environmentId,
    agentId: params.agentId,
    conversationId: params.conversationId,
    platform: params.platform,
    threadKind: params.threadKind,
    reason: params.reason,
    periodKey: params.periodKey,
    apiServiceLevel: params.apiServiceLevel,
  });
}

/**
 * Fired when an organization reaches/exceeds its included active-conversations
 * limit. Fires on every finite tier (not just Free): for Free `blocked` is true
 * (the engagement was short-circuited); for paid tiers `blocked` is false and
 * `overage` measures the extra conversations beyond the included amount — the
 * signal for deciding overage pricing. Org-scoped.
 */
export function trackAgentActiveConversationLimitReached(
  analytics: AnalyticsService,
  params: {
    organizationId: string;
    environmentId: string;
    agentId: string;
    conversationId: string;
    platform: string;
    apiServiceLevel: string;
    limit: number;
    currentCount: number;
    overage: number;
    blocked: boolean;
  }
): void {
  analytics.track(`Agent Active Conversation Limit Reached - ${AGENT_SEGMENT_CATEGORY}`, params.organizationId, {
    _organization: params.organizationId,
    environmentId: params.environmentId,
    agentId: params.agentId,
    conversationId: params.conversationId,
    platform: params.platform,
    apiServiceLevel: params.apiServiceLevel,
    limit: params.limit,
    currentCount: params.currentCount,
    overage: params.overage,
    blocked: params.blocked,
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
