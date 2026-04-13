import { Module } from '@nestjs/common';
import { ChannelConnectionRepository } from '@novu/dal';

import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';
import { AgentsController } from './agents.controller';
import { AgentsWebhookController } from './agents-webhook.controller';
import { ChatSdkService } from './services/chat-sdk.service';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [AgentsController, AgentsWebhookController],
  providers: [...USE_CASES, ChannelConnectionRepository, ChatSdkService],
  exports: [...USE_CASES, ChatSdkService],
})
export class AgentsModule {}
