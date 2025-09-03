import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { AnalyticsService, InstrumentUsecase } from '@novu/application-generic';
import {
  BaseRepository,
  EnvironmentRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  SubscriberRepository,
} from '@novu/dal';
import { PreferenceLevelEnum } from '@novu/shared';
import { BulkUpdatePreferenceItemDto } from '../../dtos/bulk-update-preferences-request.dto';
import { AnalyticsEventsEnum } from '../../utils';
import { InboxPreference } from '../../utils/types';
import { UpdatePreferencesCommand } from '../update-preferences/update-preferences.command';
import { UpdatePreferences } from '../update-preferences/update-preferences.usecase';
import { BulkUpdatePreferencesCommand } from './bulk-update-preferences.command';

const MAX_BULK_LIMIT = 100;

@Injectable()
export class BulkUpdatePreferences {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private subscriberRepository: SubscriberRepository,
    private analyticsService: AnalyticsService,
    private updatePreferencesUsecase: UpdatePreferences,
    private environmentRepository: EnvironmentRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: BulkUpdatePreferencesCommand): Promise<InboxPreference[]> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);
    if (!subscriber) throw new NotFoundException(`Subscriber with id: ${command.subscriberId} is not found`);

    if (command.preferences.length === 0) {
      throw new BadRequestException('No preferences provided for bulk update');
    }

    if (command.preferences.length > MAX_BULK_LIMIT) {
      throw new UnprocessableEntityException(`preferences must contain no more than ${MAX_BULK_LIMIT} elements`);
    }

    const allWorkflowIds = command.preferences.map((preference) => preference.workflowId);
    const workflowInternalIds = allWorkflowIds.filter((id) => BaseRepository.isInternalId(id));
    const workflowIdentifiers = allWorkflowIds.filter((id) => !BaseRepository.isInternalId(id));

    const dbWorkflows = await this.notificationTemplateRepository.find({
      _environmentId: command.environmentId,
      $or: [{ _id: { $in: workflowInternalIds } }, { 'triggers.identifier': { $in: workflowIdentifiers } }],
    });

    const allValidWorkflowsMap = new Map<string, NotificationTemplateEntity>();
    if (dbWorkflows && dbWorkflows.length > 0) {
      for (const workflow of dbWorkflows) {
        allValidWorkflowsMap.set(workflow._id, workflow);

        if (workflow.triggers?.[0]?.identifier) {
          allValidWorkflowsMap.set(workflow.triggers[0].identifier, workflow);
        }
      }
    }

    const invalidWorkflowIds = allWorkflowIds.filter((id) => !allValidWorkflowsMap.has(id));
    if (invalidWorkflowIds.length > 0) {
      throw new NotFoundException(`Workflows with ids: ${invalidWorkflowIds.join(', ')} not found`);
    }

    const criticalWorkflows = dbWorkflows.filter((workflow) => workflow.critical);
    if (criticalWorkflows.length > 0) {
      const criticalWorkflowIds = criticalWorkflows.map((workflow) => workflow._id);
      throw new BadRequestException(`Critical workflows with ids: ${criticalWorkflowIds.join(', ')} cannot be updated`);
    }

    // deduplicate preferences by workflow document ID, it ensures we only process one update per actual workflow document
    const workflowPreferencesMap = new Map<
      string,
      { preference: BulkUpdatePreferenceItemDto; workflow: NotificationTemplateEntity }
    >();
    for (const preference of command.preferences) {
      const workflow = allValidWorkflowsMap.get(preference.workflowId);
      if (workflow) {
        workflowPreferencesMap.set(workflow._id, {
          preference,
          workflow,
        });
      }
    }

    const environment = await this.environmentRepository.findOne({
      _id: command.environmentId,
    });

    const updatePromises = Array.from(workflowPreferencesMap.entries()).map(
      async ([workflowId, { preference, workflow }]) => {
        return this.updatePreferencesUsecase.execute(
          UpdatePreferencesCommand.create({
            organizationId: command.organizationId,
            subscriberId: command.subscriberId,
            environmentId: command.environmentId,
            level: PreferenceLevelEnum.TEMPLATE,
            chat: preference.chat,
            email: preference.email,
            in_app: preference.in_app,
            push: preference.push,
            sms: preference.sms,
            workflowIdOrIdentifier: workflowId,
            workflow,
            includeInactiveChannels: false,
            subscriber,
            // biome-ignore lint/style/noNonNullAssertion: environment is always found
            environment: environment!,
          })
        );
      }
    );

    const updatedPreferences = await Promise.all(updatePromises);

    this.analyticsService.mixpanelTrack(AnalyticsEventsEnum.UPDATE_PREFERENCES_BULK, '', {
      _organization: command.organizationId,
      _subscriber: subscriber._id,
      workflowIds: Array.from(workflowPreferencesMap.keys()),
      level: PreferenceLevelEnum.TEMPLATE,
    });

    return updatedPreferences;
  }
}
