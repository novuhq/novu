import { Module } from '@nestjs/common';
import { USE_CASES } from './usecases';
import { FeedsController } from './feeds.controller';
import { SharedModule } from '../shared/shared.module';
import { ChangeModule } from '../change/change.module';
import { MessageTemplateModule } from '../message-template/message-template.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SharedModule, MessageTemplateModule, ChangeModule, AuthModule],
  providers: [...USE_CASES],
  controllers: [FeedsController],
  exports: [...USE_CASES],
})
export class FeedsModule {}
