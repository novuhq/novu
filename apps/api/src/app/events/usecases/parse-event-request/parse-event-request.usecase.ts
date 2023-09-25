import { Injectable, UnprocessableEntityException, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import * as hat from 'hat';
import { merge } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import {
  buildNotificationTemplateIdentifierKey,
  CachedEntity,
  Instrument,
  InstrumentUsecase,
  StorageHelperService,
  WorkflowQueueService,
} from '@novu/application-generic';
import { NotificationTemplateRepository, NotificationTemplateEntity, TenantRepository } from '@novu/dal';
import {
  ISubscribersDefine,
  ITenantDefine,
  ReservedVariablesMap,
  TriggerContextTypeEnum,
  TriggerTenantContext,
} from '@novu/shared';

import { ParseEventRequestCommand } from './parse-event-request.command';

import { ApiException } from '../../../shared/exceptions/api.exception';
import { VerifyPayload, VerifyPayloadCommand } from '../verify-payload';
import { MapTriggerRecipients, MapTriggerRecipientsCommand } from '../map-trigger-recipients';

const LOG_CONTEXT = 'ParseEventRequest';

@Injectable()
export class ParseEventRequest {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private verifyPayload: VerifyPayload,
    private storageHelperService: StorageHelperService,
    private workflowQueueService: WorkflowQueueService,
    private mapTriggerRecipients: MapTriggerRecipients,
    private tenantRepository: TenantRepository
  ) {}

  @InstrumentUsecase()
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

    const template = await this.getNotificationTemplateByTriggerIdentifier({
      environmentId: command.environmentId,
      triggerIdentifier: command.identifier,
    });

    if (!template) {
      throw new UnprocessableEntityException('workflow_not_found');
    }

    const reservedVariablesTypes = this.getReservedVariablesTypes(template);
    this.validateTriggerContext(command, reservedVariablesTypes);

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

    if (command.tenant) {
      try {
        await this.validateTenant(typeof command.tenant === 'string' ? command.tenant : command.tenant.identifier);
      } catch (e) {
        return {
          acknowledged: true,
          status: 'no_tenant_found',
        };
      }
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
    await this.workflowQueueService.add(transactionId, jobData, command.organizationId);

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

  private async validateTenant(identifier: string) {
    const found = await this.tenantRepository.findOne({
      identifier,
    });
    if (!found) {
      throw new ApiException(`Tenant with identifier ${identifier} cound not be found`);
    }
  }

  @Instrument()
  private async validateSubscriberIdProperty(to: ISubscribersDefine[]): Promise<boolean> {
    for (const subscriber of to) {
      const subscriberIdExists = typeof subscriber === 'string' ? subscriber : subscriber.subscriberId;

      if (!subscriberIdExists) {
        throw new ApiException(
          'subscriberId under property to is not configured, please make sure all subscribers contains subscriberId property'
        );
      }
    }

    return true;
  }

  @Instrument()
  private validateTriggerContext(
    command: ParseEventRequestCommand,
    reservedVariablesTypes: TriggerContextTypeEnum[]
  ): void {
    const invalidKeys: string[] = [];

    for (const reservedVariableType of reservedVariablesTypes) {
      const payload = command[reservedVariableType];
      if (!payload) {
        invalidKeys.push(`${reservedVariableType} object`);
        continue;
      }
      const reservedVariableFields = ReservedVariablesMap[reservedVariableType].map((variable) => variable.name);
      for (const variableName of reservedVariableFields) {
        const variableNameExists = payload[variableName];

        if (!variableNameExists) {
          invalidKeys.push(`${variableName} property of ${reservedVariableType}`);
        }
      }
    }

    if (invalidKeys.length) {
      throw new ApiException(`Trigger is missing: ${invalidKeys.join(', ')}`);
    }
  }

  private modifyAttachments(command: ParseEventRequestCommand) {
    command.payload.attachments = command.payload.attachments.map((attachment) => ({
      ...attachment,
      name: attachment.name,
      file: Buffer.from(attachment.file, 'base64'),
      storagePath: `${command.organizationId}/${command.environmentId}/${hat()}/${attachment.name}`,
    }));
  }

  public mapTenant(tenant: TriggerTenantContext): ITenantDefine {
    if (typeof tenant === 'string') {
      return { identifier: tenant };
    }

    return tenant;
  }

  public getReservedVariablesTypes(template: NotificationTemplateEntity): TriggerContextTypeEnum[] {
    const reservedVariables = template.triggers[0].reservedVariables;

    return reservedVariables?.map((reservedVariable) => reservedVariable.type) || [];
  }
}
