import { Injectable } from '@nestjs/common';
import { LayoutEntity, LayoutRepository } from '@novu/dal';
import {
  FindMessageTemplatesByLayoutCommand,
  FindMessageTemplatesByLayoutUseCase,
} from '../../../message-template/usecases';
import { CheckLayoutIsUsedCommand } from './check-layout-is-used.command';

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
