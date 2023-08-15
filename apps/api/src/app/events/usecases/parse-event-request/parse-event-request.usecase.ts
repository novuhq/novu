import { Inject, Injectable, UnprocessableEntityException, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import * as hat from 'hat';
import { merge } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { Instrument, InstrumentUsecase } from '@novu/application-generic';
import { NotificationTemplateRepository } from '@novu/dal';
import { ISubscribersDefine } from '@novu/shared';
import { buildNotificationTemplateIdentifierKey, CachedEntity, StorageHelperService } from '@novu/application-generic';

import { ParseEventRequestCommand } from './parse-event-request.command';

import { EventsWorkflowQueueService } from '../../services';

import { ApiException } from '../../../shared/exceptions/api.exception';
import { VerifyPayload, VerifyPayloadCommand } from '../verify-payload';
import { MapTriggerRecipients, MapTriggerRecipientsCommand } from '../map-trigger-recipients';

@Injectable()
export class ParseEventRequest {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private verifyPayload: VerifyPayload,
    private storageHelperService: StorageHelperService,
    private eventsWorkflowQueueService: EventsWorkflowQueueService,
    private mapTriggerRecipients: MapTriggerRecipients
  ) {}

  @InstrumentUsecase()
  async execute(command: ParseEventRequestCommand) {
    const transactionId = command.transactionId || uuidv4();
    Logger.log('Starting Trigger');

    const mappedActor = command.actor ? this.mapTriggerRecipients.mapSubscriber(command.actor) : undefined;

    Logger.debug(mappedActor);

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

    const template = await this.getNotificationTemplateByTriggerIdentifier({
      environmentId: command.environmentId,
      triggerIdentifier: command.identifier,
    });

    if (!template) {
      throw new UnprocessableEntityException('workflow_not_found');
    }

    if (!template.active) {
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

    const jobData = {
      ...command,
      to: mappedRecipients,
      actor: mappedActor,
      transactionId,
    };
    await this.eventsWorkflowQueueService.add(transactionId, jobData, command.organizationId);

    return {
      acknowledged: true,
      status: 'processed',
      transactionId: transactionId,
    };
  }

  @Instrument()
  @CachedEntity({
    builder: (command: { triggerIdentifier: string; environmentId: string }) =>
      buildNotificationTemplateIdentifierKey({
        _environmentId: command.environmentId,
        templateIdentifier: command.triggerIdentifier,
      }),
  })
  private async getNotificationTemplateByTriggerIdentifier(command: {
    triggerIdentifier: string;
    environmentId: string;
  }) {
    return await this.notificationTemplateRepository.findByTriggerIdentifier(
      command.environmentId,
      command.triggerIdentifier
    );
  }

  @Instrument()
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
