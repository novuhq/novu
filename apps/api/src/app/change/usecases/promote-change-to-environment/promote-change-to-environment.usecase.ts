import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { ChangeRepository, EnvironmentRepository } from '@novu/dal';
import { ChangeEntityTypeEnum } from '@novu/shared';
import { applyDiff } from 'recursive-diff';
import { PromoteFeedChange } from '../promote-feed-change/promote-feed-change';
import { PromoteLayoutChange } from '../promote-layout-change';
import { PromoteMessageTemplateChange } from '../promote-message-template-change/promote-message-template-change';
import { PromoteNotificationGroupChange } from '../promote-notification-group-change/promote-notification-group-change';
import { PromoteTranslationChange } from '../promote-translation-change';
import { PromoteTranslationGroupChange } from '../promote-translation-group-change';
import { PromoteTypeChangeCommand } from '../promote-type-change.command';
import { INotificationTemplateChangeService } from '../shared';
import { PromoteChangeToEnvironmentCommand } from './promote-change-to-environment.command';

@Injectable()
export class PromoteChangeToEnvironment {
  constructor(
    private changeRepository: ChangeRepository,
    private environmentRepository: EnvironmentRepository,
    private promoteLayoutChange: PromoteLayoutChange,
    @Inject('INotificationTemplateChangeService')
    private promoteNotificationTemplateChange: INotificationTemplateChangeService,
    private promoteMessageTemplateChange: PromoteMessageTemplateChange,
    private promoteNotificationGroupChange: PromoteNotificationGroupChange,
    private promoteFeedChange: PromoteFeedChange,
    private promoteTranslationChange: PromoteTranslationChange,
    private promoteTranslationGroupChange: PromoteTranslationGroupChange,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: PromoteChangeToEnvironmentCommand) {
    const changes = await this.changeRepository.getEntityChanges(command.organizationId, command.type, command.itemId);
    const aggregatedItem = changes
      .filter((change) => change.enabled)
      .reduce((prev, change) => {
        return applyDiff(prev, change.change);
      }, {});

    const environment = await this.environmentRepository.findOne({
      _parentId: command.environmentId,
    });
    if (!environment) throw new NotFoundException(`Environment ${command.environmentId} not found`);

    const typeCommand = PromoteTypeChangeCommand.create({
      organizationId: command.organizationId,
      environmentId: environment._id,
      item: aggregatedItem,
      userId: command.userId,
    });

    switch (command.type) {
      case ChangeEntityTypeEnum.NOTIFICATION_TEMPLATE:
        await this.promoteNotificationTemplateChange.execute(typeCommand);
        break;
      case ChangeEntityTypeEnum.MESSAGE_TEMPLATE:
        await this.promoteMessageTemplateChange.execute(typeCommand);
        break;
      case ChangeEntityTypeEnum.NOTIFICATION_GROUP:
        await this.promoteNotificationGroupChange.execute(typeCommand);
        break;
      case ChangeEntityTypeEnum.FEED:
        await this.promoteFeedChange.execute(typeCommand);
        break;
      case ChangeEntityTypeEnum.LAYOUT:
      case ChangeEntityTypeEnum.DEFAULT_LAYOUT:
        await this.promoteLayoutChange.execute(typeCommand);
        break;
      case ChangeEntityTypeEnum.TRANSLATION:
        await this.promoteTranslationChange.execute(typeCommand);
        break;
      case ChangeEntityTypeEnum.TRANSLATION_GROUP:
        await this.promoteTranslationGroupChange.execute(typeCommand);
        break;
      default:
        this.logger.error(
          `Change with type ${command.type} could not be enabled from environment ${command.environmentId}`
        );
    }
  }
}
