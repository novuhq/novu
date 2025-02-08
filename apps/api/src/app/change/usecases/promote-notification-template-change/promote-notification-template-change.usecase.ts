import { forwardRef, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  ChangeRepository,
  EnvironmentRepository,
  MessageTemplateRepository,
  NotificationGroupRepository,
  NotificationStepData,
  NotificationStepEntity,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
} from '@novu/dal';
import {
  buildWorkflowPreferencesFromPreferenceChannels,
  ChangeEntityTypeEnum,
  DEFAULT_WORKFLOW_PREFERENCES,
  IPreferenceChannels,
  PreferencesTypeEnum,
} from '@novu/shared';
import {
  buildGroupedBlueprintsKey,
  buildNotificationTemplateIdentifierKey,
  buildNotificationTemplateKey,
  DeletePreferencesCommand,
  DeletePreferencesUseCase,
  InvalidateCacheService,
  UpsertPreferences,
  UpsertUserWorkflowPreferencesCommand,
  UpsertWorkflowPreferencesCommand,
} from '@novu/application-generic';
import { ApplyChange, ApplyChangeCommand } from '../apply-change';
import { PromoteTypeChangeCommand } from '../promote-type-change.command';

/**
 * Promote a notification template change to a workflow
 *
 * TODO: update this use-case to use the following use-cases which fully handle
 * the workflow creation, update and deletion:
 * - CreateWorkflow
 * - UpdateWorkflow
 * - DeleteWorkflow
 */
@Injectable()
export class PromoteNotificationTemplateChange {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private environmentRepository: EnvironmentRepository,
    private messageTemplateRepository: MessageTemplateRepository,
    private notificationGroupRepository: NotificationGroupRepository,
    @Inject(forwardRef(() => ApplyChange)) private applyChange: ApplyChange,
    private changeRepository: ChangeRepository,
    private upsertPreferences: UpsertPreferences,
    private deletePreferences: DeletePreferencesUseCase
  ) {}

  async execute(command: PromoteTypeChangeCommand) {
    await this.invalidateBlueprints(command);

    const item = await this.notificationTemplateRepository.findOne({
      _environmentId: command.environmentId,
      _parentId: command.item._id,
    });

    const newItem = command.item as NotificationTemplateEntity;

    const messages = await this.messageTemplateRepository.find({
      _environmentId: command.environmentId,
      _parentId: {
        $in: (newItem.steps || []).flatMap((step) => [
          step._templateId,
          ...(step.variants || []).flatMap((variant) => variant._templateId),
        ]),
      },
    });

    const missingMessages: string[] = [];

    const mapNewStepItem = (step: NotificationStepEntity) => {
      const oldMessage = messages.find((message) => {
        return message._parentId === step._templateId;
      });

      if (step.variants && step.variants.length > 0) {
        // eslint-disable-next-line no-param-reassign
        step.variants = step.variants
          ?.map(mapNewVariantItem)
          .filter((variant): variant is NotificationStepData => variant !== undefined);
      }

      if (!oldMessage) {
        missingMessages.push(step._templateId);

        return undefined;
      }

      if (step?._templateId && oldMessage._id) {
        // eslint-disable-next-line no-param-reassign
        step._templateId = oldMessage._id;
      }

      return step;
    };

    const mapNewVariantItem = (step: NotificationStepData) => {
      const oldMessage = messages.find((message) => {
        return message._parentId === step._templateId;
      });

      if (!oldMessage) {
        missingMessages.push(step._templateId);

        return undefined;
      }

      if (step?._templateId && oldMessage._id) {
        // eslint-disable-next-line no-param-reassign
        step._templateId = oldMessage._id;
      }

      return step;
    };

    const steps = newItem.steps
      ? newItem.steps.map(mapNewStepItem).filter((step): step is NotificationStepEntity => step !== undefined)
      : [];

    if (missingMessages.length > 0 && steps.length > 0 && item) {
      Logger.error(
        `Message templates with ids ${missingMessages.join(', ')} are missing for notification template ${item._id}`
      );
    }

    let notificationGroup = await this.notificationGroupRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _parentId: newItem._notificationGroupId,
    });

    if (!notificationGroup) {
      const changes = await this.changeRepository.getEntityChanges(
        command.organizationId,
        ChangeEntityTypeEnum.NOTIFICATION_GROUP,
        newItem._notificationGroupId
      );

      for (const change of changes) {
        await this.applyChange.execute(
          ApplyChangeCommand.create({
            changeId: change._id,
            environmentId: change._environmentId,
            organizationId: change._organizationId,
            userId: command.userId,
          })
        );
      }
      notificationGroup = await this.notificationGroupRepository.findOne({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _parentId: newItem._notificationGroupId,
      });
    }

    if (!notificationGroup) {
      throw new NotFoundException(
        `Notification Group Id ${newItem._notificationGroupId} not found, Notification Template: ${newItem.name}`
      );
    }

    if (!item) {
      if (newItem.deleted) {
        return;
      }

      const newNotificationTemplate: Partial<NotificationTemplateEntity> = {
        name: newItem.name,
        active: newItem.active,
        draft: newItem.draft,
        description: newItem.description,
        tags: newItem.tags,
        critical: newItem.critical,
        triggers: newItem.triggers,
        preferenceSettings: newItem.preferenceSettings,
        steps,
        _parentId: command.item._id,
        _creatorId: command.userId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _notificationGroupId: notificationGroup._id,
        isBlueprint: command.organizationId === this.blueprintOrganizationId,
        blueprintId: newItem.blueprintId,
        ...(newItem.data ? { data: newItem.data } : {}),
      };

      const createdTemplate = await this.notificationTemplateRepository.create(
        newNotificationTemplate as NotificationTemplateEntity
      );
      await this.updateWorkflowPreferences(createdTemplate._id, command, newItem.critical, newItem.preferenceSettings);

      return createdTemplate;
    }

    const count = await this.notificationTemplateRepository.count({
      _organizationId: command.organizationId,
      _id: command.item._id,
    });

    if (count === 0) {
      await this.notificationTemplateRepository.delete({ _environmentId: command.environmentId, _id: item._id });

      await this.deleteWorkflowPreferences(item._id, command);

      return;
    }

    const updatedTemplate = await this.notificationTemplateRepository.update(
      {
        _environmentId: command.environmentId,
        _id: item._id,
      },
      {
        name: newItem.name,
        active: newItem.active,
        draft: newItem.draft,
        description: newItem.description,
        tags: newItem.tags,
        critical: newItem.critical,
        triggers: newItem.triggers,
        preferenceSettings: newItem.preferenceSettings,
        steps,
        _notificationGroupId: notificationGroup._id,
        isBlueprint: command.organizationId === this.blueprintOrganizationId,
        ...(newItem.data ? { data: newItem.data } : {}),
      }
    );
    await this.updateWorkflowPreferences(item._id, command, newItem.critical, newItem.preferenceSettings);

    // Invalidate after mutations
    await this.invalidateNotificationTemplate(item, command.organizationId);

    return updatedTemplate;
  }

  private async updateWorkflowPreferences(
    workflowId: string,
    command: PromoteTypeChangeCommand,
    critical: boolean,
    preferenceSettings: IPreferenceChannels
  ) {
    await this.upsertPreferences.upsertUserWorkflowPreferences(
      UpsertUserWorkflowPreferencesCommand.create({
        templateId: workflowId,
        preferences: buildWorkflowPreferencesFromPreferenceChannels(critical, preferenceSettings),
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
      })
    );

    await this.upsertPreferences.upsertWorkflowPreferences(
      UpsertWorkflowPreferencesCommand.create({
        templateId: workflowId,
        preferences: DEFAULT_WORKFLOW_PREFERENCES,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      })
    );
  }

  private async deleteWorkflowPreferences(workflowId: string, command: PromoteTypeChangeCommand) {
    await this.deletePreferences.execute(
      DeletePreferencesCommand.create({
        templateId: workflowId,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
        type: PreferencesTypeEnum.USER_WORKFLOW,
      })
    );

    await this.deletePreferences.execute(
      DeletePreferencesCommand.create({
        templateId: workflowId,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
        type: PreferencesTypeEnum.WORKFLOW_RESOURCE,
      })
    );
  }

  private async getProductionEnvironmentId(organizationId: string) {
    const productionEnvironmentId = (
      await this.environmentRepository.findOrganizationEnvironments(organizationId)
    )?.find((env) => env.name === 'Production')?._id;

    if (!productionEnvironmentId) {
      throw new NotFoundException('Production environment not found');
    }

    return productionEnvironmentId;
  }

  private get blueprintOrganizationId() {
    return NotificationTemplateRepository.getBlueprintOrganizationId();
  }

  private async invalidateBlueprints(command: PromoteTypeChangeCommand) {
    if (command.organizationId === this.blueprintOrganizationId) {
      const productionEnvironmentId = await this.getProductionEnvironmentId(this.blueprintOrganizationId);

      if (productionEnvironmentId) {
        await this.invalidateCache.invalidateByKey({
          key: buildGroupedBlueprintsKey(productionEnvironmentId),
        });
      }
    }
  }

  private async invalidateNotificationTemplate(item: NotificationTemplateEntity, organizationId: string) {
    const productionEnvironmentId = await this.getProductionEnvironmentId(organizationId);

    /**
     * Only invalidate cache of Production environment cause the development environment cache invalidation is handled
     * during the CRUD operations itself
     */
    await this.invalidateCache.invalidateByKey({
      key: buildNotificationTemplateKey({
        _id: item._id,
        _environmentId: productionEnvironmentId,
      }),
    });

    await this.invalidateCache.invalidateByKey({
      key: buildNotificationTemplateIdentifierKey({
        templateIdentifier: item.triggers[0].identifier,
        _environmentId: productionEnvironmentId,
      }),
    });
  }
}
