import { Module } from '@nestjs/common';
import { USE_CASES } from './usecases';
import { MessageTemplateController } from './message-template.controller';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
  controllers: [MessageTemplateController],
})
export class MessageTemplateModule {}
