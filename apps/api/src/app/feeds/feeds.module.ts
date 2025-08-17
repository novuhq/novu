import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChangeModule } from '../change/change.module';
import { MessageTemplateModule } from '../message-template/message-template.module';
import { SharedModule } from '../shared/shared.module';
import { FeedsController } from './feeds.controller';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule, MessageTemplateModule, ChangeModule, AuthModule],
  providers: [...USE_CASES],
  controllers: [FeedsController],
  exports: [...USE_CASES],
})
export class FeedsModule {}
