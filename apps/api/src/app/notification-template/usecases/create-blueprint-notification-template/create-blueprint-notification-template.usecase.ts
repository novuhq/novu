import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import {
  FeedRepository,
  NotificationGroupEntity,
  NotificationGroupRepository,
  NotificationStepEntity,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
} from '@novu/dal';
import { AnalyticsService } from '@novu/application-generic';

import { CreateNotificationTemplate, CreateNotificationTemplateCommand } from '../create-notification-template';
import { CreateBlueprintNotificationTemplateCommand } from './create-blueprint-notification-template.command';

@Injectable()
export class CreateBlueprintNotificationTemplate {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private createNotificationTemplateUsecase: CreateNotificationTemplate,
    private notificationGroupRepository: NotificationGroupRepository,
    private feedRepository: FeedRepository,
    private analyticsService: AnalyticsService
  ) {}

  async execute(command: CreateBlueprintNotificationTemplateCommand): Promise<NotificationTemplateEntity> {
    const template = await this.notificationTemplateRepository.findBlueprint(command.templateId);
    if (!template) {
      throw new NotFoundException(`Template with id ${command.templateId} not found`);
    }

    const group: NotificationGroupEntity = await this.handleGroup(template._notificationGroupId, command);
    const steps: NotificationStepEntity[] = await this.handleFeeds(template.steps, command);

    const saved = await this.createNotificationTemplateUsecase.execute(
      CreateNotificationTemplateCommand.create({
        organizationId: command.organizationId,
        userId: command.userId,
        environmentId: command.environmentId,
        name: template.name,
        tags: template.tags,
        description: template.description,
        steps: steps,
        notificationGroupId: group._id,
        active: template.active ?? false,
        draft: template.draft ?? true,
        critical: template.critical ?? false,
        preferenceSettings: template.preferenceSettings,
        blueprintId: command.templateId,
      })
    );

    await this.analyticsService.track('[Notification directory] - Template created from blueprint', command.userId, {
      blueprintId: command.templateId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    return saved;
  }

  private async handleFeeds(
    steps: NotificationStepEntity[],
    command: CreateBlueprintNotificationTemplateCommand
  ): Promise<NotificationStepEntity[]> {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      if (!step.template?._feedId) {
        continue;
      }

      const originalFeed = await this.feedRepository.findOne({
        _organizationId: this.getBlueprintOrganizationId(),
        id: step.template._feedId,
      });

      if (!originalFeed) {
        step.template._feedId = undefined;
        steps[i] = step;
        continue;
      }

      let foundFeed = await this.feedRepository.findOne({
        _organizationId: command.organizationId,
        identifier: originalFeed.identifier,
      });

      if (!foundFeed) {
        foundFeed = await this.feedRepository.create({
          name: originalFeed.name,
          identifier: originalFeed.identifier,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        });
      }

      step.template._feedId = foundFeed._id;
      steps[i] = step;
    }

    return steps;
  }

  private async handleGroup(
    notificationGroupId: string,
    command: CreateBlueprintNotificationTemplateCommand
  ): Promise<NotificationGroupEntity> {
    let group = await this.notificationGroupRepository.findOne({
      name: 'General',
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    if (!group) {
      throw new NotFoundException(`Notification group with name General not found`);
    }

    const originalGroup = await this.notificationGroupRepository.findOne({
      _id: notificationGroupId,
      _organizationId: this.getBlueprintOrganizationId(),
    });
    if (!originalGroup) throw new NotFoundException(`Notification group with id ${notificationGroupId} is not found`);

    if (originalGroup && originalGroup.name !== group.name) {
      group = await this.notificationGroupRepository.findOne({
        name: originalGroup.name,
        _organizationId: command.organizationId,
      });
    }

    if (!group) {
      group = await this.notificationGroupRepository.create({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        name: originalGroup.name,
      });
    }

    return group;
  }

  private getBlueprintOrganizationId(): string {
    return NotificationTemplateRepository.getBlueprintOrganizationId() as string;
  }
}
