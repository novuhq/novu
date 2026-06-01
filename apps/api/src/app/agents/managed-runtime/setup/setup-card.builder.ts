import { PinoLogger } from '@novu/application-generic';
import type { PendingManagedAgentSetup } from '@novu/dal';
import { McpConnectionStatusEnum } from '@novu/shared';
import { OutboundGateway } from '../../conversation-runtime/egress/outbound.gateway';
import type { SlackNativeDelivery } from '../../conversation-runtime/egress/slack-native-delivery';
import { HandleAgentReplyCommand } from '../../conversation-runtime/reply/handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from '../../conversation-runtime/reply/handle-agent-reply/handle-agent-reply.usecase';
import { GenerateMcpOAuthUrlCommand } from '../../mcp/oauth/generate-mcp-oauth-url/generate-mcp-oauth-url.command';
import { GenerateMcpOAuthUrl } from '../../mcp/oauth/generate-mcp-oauth-url/generate-mcp-oauth-url.usecase';
import type { ReplyContentDto } from '../../shared/dtos/agent-reply-payload.dto';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { isProviderManagedOAuthMcp, type OAuthMcp } from './oauth-mcp.types';
import { buildSetupCard, type SetupCardRow } from './setup-card.helpers';
import { buildSetupSlackBlocks } from './setup-card.slack';

export type SetupCardDelivery = {
  content: ReplyContentDto;
  slackNative?: SlackNativeDelivery;
};

export function buildSetupCardDelivery(params: { platform?: string; mcps: SetupCardRow[] }): SetupCardDelivery {
  const content: ReplyContentDto = { card: buildSetupCard({ mcps: params.mcps }) };

  if (params.platform === AgentPlatformEnum.SLACK) {
    return {
      content,
      slackNative: buildSetupSlackBlocks(params.mcps),
    };
  }

  return { content };
}

export async function buildSetupRowsForMcps(params: {
  mcps: OAuthMcp[];
  environmentId: string;
  organizationId: string;
  agentIdentifier: string;
  subscriberId: string;
  conversationId: string;
  generateMcpOAuthUrl: GenerateMcpOAuthUrl;
  logger: PinoLogger;
}): Promise<SetupCardRow[]> {
  const rows: SetupCardRow[] = [];

  for (const mcp of params.mcps) {
    if (mcp.status === McpConnectionStatusEnum.Connected) {
      rows.push(mcp);

      continue;
    }

    if (isProviderManagedOAuthMcp(mcp)) {
      rows.push({ ...mcp, treatAsConnected: true });

      continue;
    }

    try {
      const oauthCommand = GenerateMcpOAuthUrlCommand.create({
        userId: 'system',
        environmentId: params.environmentId,
        organizationId: params.organizationId,
        agentIdentifier: params.agentIdentifier,
        mcpId: mcp.mcpId,
        subscriberId: params.subscriberId,
        conversationId: params.conversationId,
      });
      const result = await params.generateMcpOAuthUrl.executeForSetupCard(oauthCommand);
      let authorizeUrlWithAutoApprove: string | undefined;

      try {
        const autoApproveResult = await params.generateMcpOAuthUrl.executeForSetupCard(
          GenerateMcpOAuthUrlCommand.create({
            ...oauthCommand,
            trustToolsOnConnect: true,
          })
        );
        authorizeUrlWithAutoApprove = autoApproveResult.authorizeUrl;
      } catch (err) {
        params.logger.warn(
          {
            err: err instanceof Error ? err.message : String(err),
            mcpId: mcp.mcpId,
            conversationId: params.conversationId,
          },
          'GenerateMcpOAuthUrl auto-approve variant failed while building managed-agent setup card'
        );
      }

      rows.push({
        ...mcp,
        authorizeUrl: result.authorizeUrl,
        authorizeUrlWithAutoApprove,
      });
    } catch (err) {
      params.logger.warn(
        {
          err: err instanceof Error ? err.message : String(err),
          mcpId: mcp.mcpId,
          conversationId: params.conversationId,
        },
        'GenerateMcpOAuthUrl failed while building managed-agent setup card'
      );

      rows.push(mcp);
    }
  }

  return rows;
}

export async function syncSetupCardMessage(params: {
  conversationId: string;
  platform?: string;
  organizationId: string;
  environmentId: string;
  agentIdentifier: string;
  integrationIdentifier: string;
  rows: SetupCardRow[];
  pendingState: PendingManagedAgentSetup;
  handleAgentReply: HandleAgentReply;
}): Promise<string | undefined> {
  const delivery = buildSetupCardDelivery({ platform: params.platform, mcps: params.rows });
  const existingMessageId = params.pendingState.setupMessageId;

  const replyCommandBase = {
    userId: 'system',
    organizationId: params.organizationId,
    environmentId: params.environmentId,
    conversationId: params.conversationId,
    agentIdentifier: params.agentIdentifier,
    integrationIdentifier: params.integrationIdentifier,
  };

  if (existingMessageId) {
    await params.handleAgentReply.execute(
      HandleAgentReplyCommand.create({
        ...replyCommandBase,
        edit: {
          messageId: existingMessageId,
          content: delivery.content,
        },
        slackNative: delivery.slackNative,
      })
    );

    return existingMessageId;
  }

  const sent = await params.handleAgentReply.execute(
    HandleAgentReplyCommand.create({
      ...replyCommandBase,
      reply: delivery.content,
      slackNative: delivery.slackNative,
    })
  );

  return sent?.messageId;
}

export async function deleteSetupCardIfPresent(params: {
  conversationId: string;
  agentId: string;
  integrationIdentifier: string;
  platform?: string;
  platformThreadId?: string;
  pendingState: PendingManagedAgentSetup;
  logger: PinoLogger;
  outboundGateway: OutboundGateway;
}): Promise<void> {
  const setupMessageId = params.pendingState.setupMessageId;

  if (!setupMessageId || !params.platform || !params.platformThreadId) {
    return;
  }

  try {
    await params.outboundGateway.deleteInConversation(
      params.agentId,
      params.integrationIdentifier,
      params.platform,
      params.platformThreadId,
      setupMessageId
    );
  } catch (err) {
    params.logger.warn(err, `Failed to delete managed-agent setup card for conversation ${params.conversationId}`);
  }
}
