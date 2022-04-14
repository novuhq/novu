import { Injectable, Logger } from '@nestjs/common';
import { ChangeEntityTypeEnum, ChangeRepository } from '@novu/dal';
import { diffApply } from '../../utils';
import { ChangeEnabledCommand } from './change-enabled.command';
import { EnvironmentRepository } from '../../../../../../../libs/dal/src/repositories/environment/environment.repository';
import { TypeChangeEnabledCommand } from '../type-change-enabled.command';
import { ChangeEnabledNotificationTemplate } from '../change-enabled-notification-template/change-enabled-notification-template';
import { ChangeEnabledMessageTemplate } from '../change-enabled-message-template/change-enabled-message-template';

@Injectable()
export class ChangeEnabled {
  constructor(
    private changeRepository: ChangeRepository,
    private environmentRepository: EnvironmentRepository,
    private changeEnabledNotificationTemplate: ChangeEnabledNotificationTemplate,
    private changeEnabledMessageTemplate: ChangeEnabledMessageTemplate
  ) {}

  async execute(command: ChangeEnabledCommand) {
    const changes = await this.changeRepository.getEntityChanges(command.type, command.itemId);
    const aggregatedItem = changes
      .filter((change) => change.enabled)
      .reduce((prev, change) => {
        diffApply(prev, change.change);

        return prev;
      }, {});

    const environment = await this.environmentRepository.findOne({
      _parentId: command.environmentId,
    });

    const typeCommand = TypeChangeEnabledCommand.create({
      organizationId: command.organizationId,
      environmentId: environment._id,
      item: aggregatedItem,
      userId: command.userId,
    });

    switch (command.type) {
      case ChangeEntityTypeEnum.NOTIFICATION_TEMPLATE:
        await this.changeEnabledNotificationTemplate.execute(typeCommand);
        break;
      case ChangeEntityTypeEnum.MESSAGE_TEMPLATE:
        await this.changeEnabledMessageTemplate.execute(typeCommand);
        break;
      default:
        Logger.error(`Change with type ${command.type} could not be enabled from environment ${command.environmentId}`);
    }
  }
}
