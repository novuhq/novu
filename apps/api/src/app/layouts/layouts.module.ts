import { forwardRef, Module } from '@nestjs/common';

import { USE_CASES } from './usecases';
import { LayoutsController } from './layouts.controller';

import { ChangeModule } from '../change/change.module';
import { MessageTemplateModule } from '../message-template/message-template.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule, ChangeModule, MessageTemplateModule],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
  controllers: [LayoutsController],
})
export class LayoutsModule {}
