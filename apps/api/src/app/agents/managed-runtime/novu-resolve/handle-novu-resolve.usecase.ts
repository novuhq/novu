import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { HandleAgentReplyCommand } from '../../conversation-runtime/reply/handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from '../../conversation-runtime/reply/handle-agent-reply/handle-agent-reply.usecase';
import { ManagedAgentService } from '../managed-agent.service';
import { HandleNovuResolveCommand } from './handle-novu-resolve.command';

@Injectable()
export class HandleNovuResolve {
  constructor(
    private readonly handleAgentReply: HandleAgentReply,
    @Inject(forwardRef(() => ManagedAgentService))
    private readonly managedAgentService: ManagedAgentService
  ) {}

  async execute(command: HandleNovuResolveCommand): Promise<void> {
    const summary = command.summary?.trim() || undefined;

    // Resume the managed session before resolve — resolve clears externalSessionId.
    await this.managedAgentService.sendToolResult({
      conversationId: command.conversationId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentIdentifier: command.agentIdentifier,
      integrationIdentifier: command.integrationIdentifier,
      subscriberId: command.subscriberId,
      toolUseId: command.toolUseId,
      content: JSON.stringify({
        ok: true,
        resolved: true,
        ...(summary !== undefined ? { summary } : {}),
        instruction:
          'Conversation marked resolved. You may send a brief closing message if you have not already. Do not continue troubleshooting.',
      }),
      platform: command.platform,
      platformThreadId: command.platformThreadId,
    });

    await this.handleAgentReply.execute(
      HandleAgentReplyCommand.create({
        userId: command.organizationId,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        conversationId: command.conversationId,
        agentIdentifier: command.agentIdentifier,
        integrationIdentifier: command.integrationIdentifier,
        resolve: { summary },
      })
    );
  }
}
