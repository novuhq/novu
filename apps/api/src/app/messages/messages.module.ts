import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { SharedModule } from '../shared/shared.module';
import { USE_CASES } from './usecases';
import { MessagesController } from './messages.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SharedModule, AuthModule, TerminusModule],
  controllers: [MessagesController],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class MessagesModule {}
