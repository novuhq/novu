import { NotificationTemplateRepository } from '@novu/dal';
import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import * as hat from 'hat';
import { merge } from 'lodash';

import { AnalyticsService } from '../../../shared/services/analytics/analytics.service';
import { ANALYTICS_SERVICE } from '../../../shared/shared.module';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { VerifyPayload } from '../verify-payload/verify-payload.usecase';
import { VerifyPayloadCommand } from '../verify-payload/verify-payload.command';
import { StorageHelperService } from '../../services/storage-helper-service/storage-helper.service';
import { ParseEventRequestCommand } from './parse-event-request.command';
import { TriggerHandlerQueueService } from '../../services/workflow-queue/trigger-handler-queue.service';

@Injectable()
export class ParseEventRequest {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private verifyPayload: VerifyPayload,
    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService,
    private storageHelperService: StorageHelperService,
    private triggerHandlerQueueService: TriggerHandlerQueueService
  ) {}

  async execute(command: ParseEventRequestCommand) {
    await this.validateSubscriberIdProperty(command);

    const template = await this.notificationTemplateRepository.findByTriggerIdentifier(
      command.environmentId,
      command.identifier
    );

    if (!template) {
      throw new UnprocessableEntityException('TEMPLATE_NOT_FOUND');
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
      command.transactionId,
      {
        ...command,
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
      transactionId: command.transactionId,
    };
  }

  private async validateSubscriberIdProperty(command: ParseEventRequestCommand): Promise<boolean> {
    for (const subscriber of command.to) {
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
