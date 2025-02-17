import { forwardRef, Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { SharedModule } from '../shared/shared.module';
import { USE_CASES } from './usecases';
import { MessagesController } from './messages.controller';
import { AuthModule } from '../auth/auth.module';
import { WidgetsModule } from '../widgets/widgets.module';
import { SubscribersV1Module } from '../subscribers/subscribersV1.module';

@Module({
  imports: [SharedModule, SubscribersV1Module, AuthModule, TerminusModule, forwardRef(() => WidgetsModule)],
  controllers: [MessagesController],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class MessagesModule {}
