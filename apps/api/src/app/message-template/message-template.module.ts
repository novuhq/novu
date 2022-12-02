import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { ChangeModule } from '../change/change.module';
import { USE_CASES } from './usecases';
import { MessageTemplateController } from './message-template.controller';

@Module({
  imports: [SharedModule, ChangeModule],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
  controllers: [MessageTemplateController],
})
export class MessageTemplateModule {}
