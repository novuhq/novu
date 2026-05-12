import { Module } from '@nestjs/common';
import {
  ChannelConnectionRepository,
  ChannelEndpointRepository,
  ConversationActivityRepository,
  ConversationRepository,
} from '@novu/dal';

import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { SharedModule } from '../shared/shared.module';
import { AgentEmailActionsController } from './agent-email-actions.controller';
import { AgentsController } from './agents.controller';
import { AgentsWebhookController } from './agents-webhook.controller';
import { AgentAttachmentStorage } from './services/agent-attachment-storage.service';
import { AgentConfigResolver } from './services/agent-config-resolver.service';
import { AgentConversationService } from './services/agent-conversation.service';
import { AgentEmailActionTokenService } from './services/agent-email-action-token.service';
import { AgentInboundHandler } from './services/agent-inbound-handler.service';
import { AgentSubscriberResolver } from './services/agent-subscriber-resolver.service';
import { BridgeExecutorService } from './services/bridge-executor.service';
import { ChatSdkService } from './services/chat-sdk.service';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule, AuthModule, EventsModule],
  controllers: [AgentsController, AgentsWebhookController, AgentEmailActionsController],
  providers: [
    ...USE_CASES,
    ChannelConnectionRepository,
    ChannelEndpointRepository,
    ConversationRepository,
    ConversationActivityRepository,
    AgentAttachmentStorage,
    AgentConfigResolver,
    AgentSubscriberResolver,
    AgentConversationService,
    AgentEmailActionTokenService,
    AgentInboundHandler,
    BridgeExecutorService,
    ChatSdkService,
  ],
  exports: [...USE_CASES, ChatSdkService],
})
export class AgentsModule {}
