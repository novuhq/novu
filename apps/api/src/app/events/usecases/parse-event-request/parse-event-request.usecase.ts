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
  IWorkflowDataDto,
  IWorkflowJobDto,
  StorageHelperService,
  WorkflowQueueService,
} from '@novu/application-generic';
import { ReservedVariablesMap, TriggerContextTypeEnum, TriggerEventStatusEnum } from '@novu/shared';
import {
  WorkflowOverrideRepository,
  TenantEntity,
  WorkflowOverrideEntity,
  NotificationTemplateRepository,
  NotificationTemplateEntity,
  TenantRepository,
} from '@novu/dal';

import { ParseEventRequestCommand } from './parse-event-request.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { VerifyPayload, VerifyPayloadCommand } from '../verify-payload';

const LOG_CONTEXT = 'ParseEventRequest';

@Injectable()
export class ParseEventRequest {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private verifyPayload: VerifyPayload,
    private storageHelperService: StorageHelperService,
    private workflowQueueService: WorkflowQueueService,
    private tenantRepository: TenantRepository,
    private workflowOverrideRepository: WorkflowOverrideRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: ParseEventRequestCommand) {
    const transactionId = command.transactionId || uuidv4();

    const template = await this.getNotificationTemplateByTriggerIdentifier({
      environmentId: command.environmentId,
      triggerIdentifier: command.identifier,
    });

    if (!template) {
      throw new UnprocessableEntityException('workflow_not_found');
    }

    const reservedVariablesTypes = this.getReservedVariablesTypes(template);
    this.validateTriggerContext(command, reservedVariablesTypes);

    let tenant: TenantEntity | null = null;
    if (command.tenant) {
      tenant = await this.tenantRepository.findOne({
        _environmentId: command.environmentId,
        identifier: typeof command.tenant === 'string' ? command.tenant : command.tenant.identifier,
      });

      if (!tenant) {
        return {
          acknowledged: true,
          status: TriggerEventStatusEnum.TENANT_MISSING,
        };
      }
    }

    let workflowOverride: WorkflowOverrideEntity | null = null;
    if (tenant) {
      workflowOverride = await this.workflowOverrideRepository.findOne({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _workflowId: template._id,
        _tenantId: tenant._id,
      });
    }

    const inactiveWorkflow = !workflowOverride && !template.active;
    const inactiveWorkflowOverride = workflowOverride && !workflowOverride.active;

    if (inactiveWorkflowOverride || inactiveWorkflow) {
      const message = workflowOverride ? 'Workflow is not active by workflow override' : 'Workflow is not active';
      Logger.log(message, LOG_CONTEXT);

      return {
        acknowledged: true,
        status: TriggerEventStatusEnum.NOT_ACTIVE,
      };
    }

    if (!template.steps?.length) {
      return {
        acknowledged: true,
        status: TriggerEventStatusEnum.NO_WORKFLOW_STEPS,
      };
    }

    if (!template.steps?.some((step) => step.active)) {
      return {
        acknowledged: true,
        status: TriggerEventStatusEnum.NO_WORKFLOW_ACTIVE_STEPS,
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

    const jobData: IWorkflowDataDto = {
      ...command,
      actor: command.actor,
      transactionId,
    };

    await this.workflowQueueService.add({ name: transactionId, data: jobData, groupId: command.organizationId });

    return {
      acknowledged: true,
      status: TriggerEventStatusEnum.PROCESSED,
      transactionId,
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

  public getReservedVariablesTypes(template: NotificationTemplateEntity): TriggerContextTypeEnum[] {
    const reservedVariables = template.triggers[0].reservedVariables;

    return reservedVariables?.map((reservedVariable) => reservedVariable.type) || [];
  }
}
