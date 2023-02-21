import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import * as hat from 'hat';
import { merge } from 'lodash';
import { AnalyticsService } from '@novu/application-generic';
import { NotificationTemplateRepository } from '@novu/dal';
import { ISubscribersDefine } from '@novu/shared';
import { v4 as uuidv4 } from 'uuid';

import { ANALYTICS_SERVICE } from '../../../shared/shared.module';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { VerifyPayload } from '../verify-payload/verify-payload.usecase';
import { VerifyPayloadCommand } from '../verify-payload/verify-payload.command';
import { StorageHelperService } from '../../services/storage-helper-service/storage-helper.service';
import { ParseEventRequestCommand } from './parse-event-request.command';
import { TriggerHandlerQueueService } from '../../services/workflow-queue/trigger-handler-queue.service';
import { MapTriggerRecipients, MapTriggerRecipientsCommand } from '../map-trigger-recipients';

@Injectable()
export class ParseEventRequest {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private verifyPayload: VerifyPayload,
    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService,
    private storageHelperService: StorageHelperService,
    private triggerHandlerQueueService: TriggerHandlerQueueService,
    private mapTriggerRecipients: MapTriggerRecipients
  ) {}

  async execute(command: ParseEventRequestCommand) {
    const transactionId = command.transactionId || uuidv4();

    const mappedActor = command.actor ? this.mapTriggerRecipients.mapSubscriber(command.actor) : undefined;
    const mappedRecipients = await this.mapTriggerRecipients.execute(
      MapTriggerRecipientsCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        recipients: command.to,
        transactionId,
        userId: command.userId,
        actor: mappedActor,
      })
    );

    await this.validateSubscriberIdProperty(mappedRecipients);

    const template = await this.notificationTemplateRepository.findByTriggerIdentifier(
      command.environmentId,
      command.identifier
    );

    if (!template) {
      throw new UnprocessableEntityException('template_not_found');
    }

    if (!template.active || template.draft) {
      return {
        acknowledged: true,
        status: 'trigger_not_active',
      };
    }

    if (!template.steps?.length) {
      return {
        acknowledged: true,
        status: 'no_workflow_steps_defined',
      };
    }

    if (!template.steps?.some((step) => step.active)) {
      return {
        acknowledged: true,
        status: 'no_workflow_active_steps_defined',
      };
    }

    Sentry.addBreadcrumb({
      message: 'Sending trigger',
      data: {
        triggerIdentifier: command.identifier,
      },
    });

    // Modify Attachment Key Name, Upload attachments to Storage Provider and Remove file from payload
    if (command.payload && Array.isArray(command.payload.attachments)) {
      this.modifyAttachments(command);
      await this.storageHelperService.uploadAttachments(command.payload.attachments);
      command.payload.attachments = command.payload.attachments.map(({ file, ...attachment }) => attachment);
    }

    const defaultPayload = this.verifyPayload.execute(
      VerifyPayloadCommand.create({
        payload: command.payload,
        template,
      })
    );

    command.payload = merge({}, defaultPayload, command.payload);

    await this.triggerHandlerQueueService.queue.add(
      transactionId,
      {
        ...command,
        to: mappedRecipients,
        actor: mappedActor,
        transactionId,
      },
      {
        removeOnComplete: true,
        removeOnFail: true,
      }
    );

    const steps = template.steps;

    if (!command.payload.$on_boarding_trigger) {
      this.analyticsService.track('Notification event trigger - [Triggers]', command.userId, {
        _template: template._id,
        _organization: command.organizationId,
        channels: steps.map((step) => step.template?.type),
      });
    }

    if (command.payload.$on_boarding_trigger && template.name.toLowerCase().includes('on-boarding')) {
      return 'Your first notification was sent! Check your notification bell in the demo dashboard to Continue.';
    }

    return {
      acknowledged: true,
      status: 'processed',
      transactionId: transactionId,
    };
  }

  private async validateSubscriberIdProperty(to: ISubscribersDefine[]): Promise<boolean> {
    for (const subscriber of to) {
      const subscriberIdExists = typeof subscriber === 'string' ? subscriber : subscriber.subscriberId;

      if (!subscriberIdExists) {
        throw new ApiException(
          'subscriberId under property to is not configured, please make sure all the subscriber contains subscriberId property'
        );
      }
    }

    return true;
  }

  private modifyAttachments(command: ParseEventRequestCommand) {
    command.payload.attachments = command.payload.attachments.map((attachment) => ({
      ...attachment,
      name: attachment.name,
      file: Buffer.from(attachment.file, 'base64'),
      storagePath: `${command.organizationId}/${command.environmentId}/${hat()}/${attachment.name}`,
    }));
  }
}
