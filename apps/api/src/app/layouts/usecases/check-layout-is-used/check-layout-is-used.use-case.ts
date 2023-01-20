import { LayoutEntity, LayoutRepository } from '@novu/dal';
import { Injectable } from '@nestjs/common';

import { CheckLayoutIsUsedCommand } from './check-layout-is-used.command';
import {
  FindMessageTemplatesByLayoutCommand,
  FindMessageTemplatesByLayoutUseCase,
} from '../../../message-template/usecases';

@Injectable()
export class CheckLayoutIsUsedUseCase {
  constructor(private findMessageTemplatesByLayout: FindMessageTemplatesByLayoutUseCase) {}

  async execute(command: CheckLayoutIsUsedCommand): Promise<boolean> {
    const findMessageTemplatesByLayoutCommand = FindMessageTemplatesByLayoutCommand.create({
      environmentId: command.environmentId,
      layoutId: command.layoutId,
      organizationId: command.organizationId,
    });

    const messageTemplates = await this.findMessageTemplatesByLayout.execute(findMessageTemplatesByLayoutCommand);

    return messageTemplates.length > 0;
  }
}
