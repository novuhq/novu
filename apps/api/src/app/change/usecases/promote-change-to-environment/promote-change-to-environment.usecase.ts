import { BadRequestException, forwardRef, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ChangeRepository, EnvironmentRepository } from '@novu/dal';
import { ChangeEntityTypeEnum } from '@novu/shared';
import { applyDiff } from 'recursive-diff';

import { PromoteChangeToEnvironmentCommand } from './promote-change-to-environment.command';
import { PromoteTypeChangeCommand } from '../promote-type-change.command';
import { PromoteLayoutChange } from '../promote-layout-change';
import { PromoteNotificationTemplateChange } from '../promote-notification-template-change';
import { PromoteMessageTemplateChange } from '../promote-message-template-change/promote-message-template-change';
import { PromoteNotificationGroupChange } from '../promote-notification-group-change/promote-notification-group-change';
import { PromoteFeedChange } from '../promote-feed-change/promote-feed-change';
import { ModuleRef } from '@nestjs/core';
import { PromoteTranslationChange } from '../promote-translation-change/promote-translation-change.usecase';

@Injectable()
export class PromoteChangeToEnvironment {
  constructor(
    private changeRepository: ChangeRepository,
    private environmentRepository: EnvironmentRepository,
    private promoteLayoutChange: PromoteLayoutChange,
    @Inject(forwardRef(() => PromoteNotificationTemplateChange))
    private promoteNotificationTemplateChange: PromoteNotificationTemplateChange,
    private promoteMessageTemplateChange: PromoteMessageTemplateChange,
    private promoteNotificationGroupChange: PromoteNotificationGroupChange,
    private promoteFeedChange: PromoteFeedChange,
    private promoteTranslationChange: PromoteTranslationChange,
    private moduleRef: ModuleRef
  ) {}

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
        try {
          if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
            if (!require('@novu/ee-translation')?.PromoteTranslationGroupChange) {
              throw new BadRequestException('Translation module is not loaded');
            }
            const usecase = this.moduleRef.get(require('@novu/ee-translation')?.PromoteTranslationGroupChange, {
              strict: false,
            });
            await usecase.execute(typeCommand);
          }
        } catch (e) {
          Logger.error(e, `Unexpected error while importing enterprise modules`, 'PromoteChangeToEnvironment');
        }
        break;
      default:
        Logger.error(`Change with type ${command.type} could not be enabled from environment ${command.environmentId}`);
    }
  }
}
