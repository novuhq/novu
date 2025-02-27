import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { addBreadcrumb } from '@sentry/node';
import { randomBytes } from 'crypto';
import { merge } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

import {
  ExecuteBridgeRequest,
  ExecuteBridgeRequestCommand,
  ExecuteBridgeRequestDto,
  FeatureFlagsService,
  Instrument,
  InstrumentUsecase,
  IWorkflowDataDto,
  PinoLogger,
  StorageHelperService,
  WorkflowQueueService,
} from '@novu/application-generic';
import {
  EnvironmentEntity,
  EnvironmentRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  OrganizationEntity,
  TenantEntity,
  TenantRepository,
  UserEntity,
  WorkflowOverrideEntity,
  WorkflowOverrideRepository,
} from '@novu/dal';
import { DiscoverWorkflowOutput, GetActionEnum } from '@novu/framework/internal';
import {
  FeatureFlagsKeysEnum,
  ReservedVariablesMap,
  SUBSCRIBER_ID_REGEX,
  TriggerContextTypeEnum,
  TriggerEventStatusEnum,
  TriggerRecipient,
  TriggerRecipients,
  TriggerRecipientsPayload,
  WorkflowOriginEnum,
} from '@novu/shared';

import { ApiException } from '../../../shared/exceptions/api.exception';
import { VerifyPayload, VerifyPayloadCommand } from '../verify-payload';
import {
  ParseEventRequestBroadcastCommand,
  ParseEventRequestCommand,
  ParseEventRequestMulticastCommand,
} from './parse-event-request.command';

const LOG_CONTEXT = 'ParseEventRequest';

@Injectable()
export class ParseEventRequest {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private environmentRepository: EnvironmentRepository,
    private verifyPayload: VerifyPayload,
    private storageHelperService: StorageHelperService,
    private workflowQueueService: WorkflowQueueService,
    private tenantRepository: TenantRepository,
    private workflowOverrideRepository: WorkflowOverrideRepository,
    private executeBridgeRequest: ExecuteBridgeRequest,
    private logger: PinoLogger,
    private featureFlagService: FeatureFlagsService,
    protected moduleRef: ModuleRef
  ) {}

  @InstrumentUsecase()
  public async execute(command: ParseEventRequestCommand) {
    const transactionId = command.transactionId || uuidv4();

    const { environment, statelessWorkflowAllowed } = await this.isStatelessWorkflowAllowed(
      command.environmentId,
      command.bridgeUrl
    );

    if (environment && statelessWorkflowAllowed) {
      const discoveredWorkflow = await this.queryDiscoverWorkflow(command);

      if (!discoveredWorkflow) {
        throw new UnprocessableEntityException('workflow_not_found');
      }

      return await this.dispatchEventToWorkflowQueue(command, transactionId, discoveredWorkflow);
    }

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
      this.logger.info(command, `${LOG_CONTEXT}:${message}`);

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

    addBreadcrumb({
      message: 'Sending trigger',
      data: {
        triggerIdentifier: command.identifier,
      },
    });

    // Modify Attachment Key Name, Upload attachments to Storage Provider and Remove file from payload
    if (command.payload && Array.isArray(command.payload.attachments)) {
      this.modifyAttachments(command);
      await this.storageHelperService.uploadAttachments(command.payload.attachments);
      // eslint-disable-next-line no-param-reassign
      command.payload.attachments = command.payload.attachments.map(({ file, ...attachment }) => attachment);
    }

    const defaultPayload = this.verifyPayload.execute(
      VerifyPayloadCommand.create({
        payload: command.payload,
        template,
      })
    );
    // eslint-disable-next-line no-param-reassign
    command.payload = merge({}, defaultPayload, command.payload);

    const result = await this.dispatchEventToWorkflowQueue(command, transactionId);

    return result;
  }

  private async queryDiscoverWorkflow(command: ParseEventRequestCommand): Promise<DiscoverWorkflowOutput | null> {
    if (!command.bridgeUrl) {
      return null;
    }

    const discover = (await this.executeBridgeRequest.execute(
      ExecuteBridgeRequestCommand.create({
        statelessBridgeUrl: command.bridgeUrl,
        environmentId: command.environmentId,
        action: GetActionEnum.DISCOVER,
        workflowOrigin: WorkflowOriginEnum.EXTERNAL,
      })
    )) as ExecuteBridgeRequestDto<GetActionEnum.DISCOVER>;

    return discover?.workflows?.find((findWorkflow) => findWorkflow.workflowId === command.identifier) || null;
  }

  private async dispatchEventToWorkflowQueue(
    command: ParseEventRequestMulticastCommand | ParseEventRequestBroadcastCommand,
    transactionId,
    discoveredWorkflow?: DiscoverWorkflowOutput | null
  ) {
    const commandArgs = {
      ...command,
    };

    const isDryRun = await this.featureFlagService.getFlag({
      environment: { _id: command.environmentId } as EnvironmentEntity,
      organization: { _id: command.organizationId } as OrganizationEntity,
      user: { _id: command.userId } as UserEntity,
      key: FeatureFlagsKeysEnum.IS_SUBSCRIBER_ID_VALIDATION_DRY_RUN_ENABLED,
      defaultValue: false,
    });

    if ('to' in commandArgs) {
      const { validSubscribers, inValidSubscribers } = this.separateRecipients(commandArgs.to);

      if (inValidSubscribers.length > 0 && isDryRun) {
        Logger.warn(
          `[Dry run] Invalid recipients: ${inValidSubscribers.map((recipient) => JSON.stringify(recipient)).join(', ')}`,
          'ParseEventRequest'
        );
      }

      if (!validSubscribers && !isDryRun) {
        return {
          acknowledged: true,
          status: TriggerEventStatusEnum.INVALID_RECIPIENTS,
          transactionId,
        };
      }

      if (!isDryRun && validSubscribers) {
        commandArgs.to = validSubscribers;
      }
    }

    const jobData: IWorkflowDataDto = {
      ...commandArgs,
      actor: command.actor,
      transactionId,
      bridgeWorkflow: discoveredWorkflow ?? undefined,
    };

    await this.workflowQueueService.add({ name: transactionId, data: jobData, groupId: command.organizationId });
    this.logger.info(
      { ...command, transactionId, discoveredWorkflowId: discoveredWorkflow?.workflowId },
      'TriggerEventUseCase - Event dispatched to [Workflow] Queue'
    );

    return {
      acknowledged: true,
      status: TriggerEventStatusEnum.PROCESSED,
      transactionId,
    };
  }

  private async isStatelessWorkflowAllowed(
    environmentId: string,
    bridgeUrl: string | undefined
  ): Promise<{ environment: EnvironmentEntity | null; statelessWorkflowAllowed: boolean }> {
    if (!bridgeUrl) {
      return { environment: null, statelessWorkflowAllowed: false };
    }

    const environment = await this.environmentRepository.findOne({ _id: environmentId });

    if (!environment) {
      throw new UnprocessableEntityException('Environment not found');
    }

    return { environment, statelessWorkflowAllowed: true };
  }

  @Instrument()
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

  private modifyAttachments(command: ParseEventRequestCommand): void {
    // eslint-disable-next-line no-param-reassign
    command.payload.attachments = command.payload.attachments.map((attachment) => {
      const randomId = randomBytes(16).toString('hex');

      return {
        ...attachment,
        name: attachment.name,
        file: Buffer.from(attachment.file, 'base64'),
        storagePath: `${command.organizationId}/${command.environmentId}/${randomId}/${attachment.name}`,
      };
    });
  }

  private getReservedVariablesTypes(template: NotificationTemplateEntity): TriggerContextTypeEnum[] {
    const { reservedVariables } = template.triggers[0];

    return reservedVariables?.map((reservedVariable) => reservedVariable.type) || [];
  }

  private isValidSubscriberId(subscriberId: string) {
    return Boolean(subscriberId?.trim().match(SUBSCRIBER_ID_REGEX));
  }

  /**
   * Separates valid and invalid recipients from the given payload.
   *
   * @param payload - The payload containing recipients to be validated.
   * @returns An object containing valid subscribers and invalid subscribers.
   * - `validSubscribers`: An array of valid recipients or null if none are valid.
   * - `inValidSubscribers`: An array of invalid recipients.
   */
  private separateRecipients(payload: TriggerRecipientsPayload): {
    validSubscribers: TriggerRecipientsPayload | null;
    inValidSubscribers: TriggerRecipientsPayload[];
  } {
    if (!payload)
      return {
        validSubscribers: null,
        inValidSubscribers: [],
      };

    if (!Array.isArray(payload)) {
      const { invalid, valid } = this.filterValidRecipient(payload);

      return {
        validSubscribers: valid as TriggerRecipientsPayload,
        inValidSubscribers: invalid ? ([invalid] as TriggerRecipientsPayload[]) : [],
      };
    }

    const invalidRecipients: TriggerRecipientsPayload[] = [];
    const recipients: TriggerRecipients = payload
      .map((subscriber) => {
        const { invalid, valid } = this.filterValidRecipient(subscriber);

        if (invalid) {
          invalidRecipients.push(invalid as TriggerRecipientsPayload);
        }

        return valid;
      })
      .filter((recipient) => recipient !== null);

    return { validSubscribers: recipients.length > 0 ? recipients : null, inValidSubscribers: invalidRecipients };
  }

  /**
   * Filters a given subscriber and determines if it is valid or invalid.
   *
   * @param subscriber - The subscriber to be validated. It can be a string or an object.
   *
   * @returns An object containing:
   * - `valid`: The valid subscriber if the input is valid, otherwise `null`.
   * - `invalid`: The invalid subscriber if the input is invalid, otherwise `null`.
   *
   * The function performs the following checks:
   * - If the subscriber is a string, it trims the string and checks if it is a valid subscriber ID.
   * - If the subscriber is an object, it checks if it contains a `topicKey` or a `subscriberId`.
   * - If it contains a `topicKey`, then we do nothing and return it as it is.
   * - If it contains a `subscriberId`, it trims the `subscriberId` and checks if it is valid.
   *
   * If the subscriber does not meet any of the above conditions, it is considered invalid.
   */
  private filterValidRecipient(subscriber: TriggerRecipient): {
    valid: TriggerRecipient | null;
    invalid: TriggerRecipient | null;
  } {
    if (typeof subscriber === 'string') {
      const trimmedSubscriber = subscriber.trim();

      return this.isValidSubscriberId(subscriber)
        ? {
            valid: trimmedSubscriber,
            invalid: null,
          }
        : {
            valid: null,
            invalid: subscriber,
          };
    }

    if (typeof subscriber === 'object' && subscriber !== null) {
      if ('topicKey' in subscriber) {
        return { valid: subscriber, invalid: null };
      }

      if ('subscriberId' in subscriber) {
        const isValidSubscriberId = this.isValidSubscriberId(subscriber.subscriberId);

        return isValidSubscriberId
          ? { valid: { ...subscriber, subscriberId: subscriber.subscriberId.trim() }, invalid: null }
          : {
              valid: null,
              invalid: subscriber,
            };
      }
    }

    return {
      valid: null,
      invalid: subscriber,
    };
  }
}
