import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CalculateLimitNovuIntegration } from '@novu/application-generic';
import {
  ChannelConnectionRepository,
  ChannelEndpointRepository,
  ConversationActivityRepository,
  ConversationRepository,
  IntegrationRepository,
  MessageRepository,
} from '@novu/dal';

import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { SharedModule } from '../shared/shared.module';
import { AgentEmailActionsController } from './agent-email-actions.controller';
import { AgentsController } from './agents.controller';
import { AgentsPublicController } from './agents-public.controller';
import { AgentsWebhookController } from './agents-webhook.controller';
import { AgentRuntimeExceptionFilter } from './filters/agent-runtime-exception.filter';
import { AgentAttachmentStorage } from './services/agent-attachment-storage.service';
import { AgentConfigResolver } from './services/agent-config-resolver.service';
import { AgentConversationService } from './services/agent-conversation.service';
import { AgentEmailActionTokenService } from './services/agent-email-action-token.service';
import { AgentInboundHandler } from './services/agent-inbound-handler.service';
import { AgentSubscriberResolver } from './services/agent-subscriber-resolver.service';
import { BridgeExecutorService } from './services/bridge-executor.service';
import { ChatSdkService } from './services/chat-sdk.service';
import { ManagedExecutorService } from './services/managed-executor.service';
import { TelegramMobileLinkTokenService } from './services/telegram-mobile-link-token.service';
import { USE_CASES } from './usecases';

@Module({
  imports: [
    SharedModule,
    AuthModule,
    EventsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  controllers: [AgentsController, AgentsPublicController, AgentsWebhookController, AgentEmailActionsController],
  providers: [
    ...USE_CASES,
    AgentRuntimeExceptionFilter,
    ChannelConnectionRepository,
    ChannelEndpointRepository,
    ConversationRepository,
    ConversationActivityRepository,
    IntegrationRepository,
    MessageRepository,
    AgentAttachmentStorage,
    AgentConfigResolver,
    AgentSubscriberResolver,
    AgentConversationService,
    AgentEmailActionTokenService,
    AgentInboundHandler,
    BridgeExecutorService,
    ManagedExecutorService,
    ChatSdkService,
    TelegramMobileLinkTokenService,
    CalculateLimitNovuIntegration,
  ],
  exports: [...USE_CASES, ChatSdkService],
})
export class AgentsModule {}
