import { Module, forwardRef } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { SharedModule } from '../shared/shared.module';
import { USE_CASES } from './usecases';
import { MessagesController } from './messages.controller';
import { AuthModule } from '../auth/auth.module';
import { WidgetsModule } from '../widgets/widgets.module';

@Module({
  imports: [SharedModule, AuthModule, TerminusModule, forwardRef(() => WidgetsModule)],
  controllers: [MessagesController],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class MessagesModule {}
