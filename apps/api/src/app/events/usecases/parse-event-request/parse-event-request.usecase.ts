import { BadRequestException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
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
  CommunityOrganizationRepository,
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
  TriggerContextTypeEnum,
  TriggerEventStatusEnum,
  TriggerRecipientsPayload,
  ResourceOriginEnum,
} from '@novu/shared';
import { addBreadcrumb } from '@sentry/node';
import { randomBytes } from 'crypto';
import { merge } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { PayloadValidationException } from '../../exceptions/payload-validation-exception';
import { RecipientSchema, RecipientsSchema } from '../../utils/trigger-recipient-validation';
import { VerifyPayload, VerifyPayloadCommand } from '../verify-payload';
import {
  ParseEventRequestBroadcastCommand,
  ParseEventRequestCommand,
  ParseEventRequestMulticastCommand,
} from './parse-event-request.command';
import { generateTransactionId } from '../../../shared/helpers';

@Injectable()
export class ParseEventRequest {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private environmentRepository: EnvironmentRepository,
    private communityOrganizationRepository: CommunityOrganizationRepository,
    private verifyPayload: VerifyPayload,
    private storageHelperService: StorageHelperService,
    private workflowQueueService: WorkflowQueueService,
    private tenantRepository: TenantRepository,
    private workflowOverrideRepository: WorkflowOverrideRepository,
    private executeBridgeRequest: ExecuteBridgeRequest,
    private logger: PinoLogger,
    private featureFlagService: FeatureFlagsService,
    protected moduleRef: ModuleRef
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  public async execute(command: ParseEventRequestCommand) {
    const transactionId = command.transactionId || generateTransactionId();

    const [environment, organization] = await Promise.all([
      this.environmentRepository.findOne({ _id: command.environmentId }),
      this.communityOrganizationRepository.findOne({ _id: command.organizationId }),
    ]);

    if (!organization) {
      throw new BadRequestException('Organization not found');
    }

    if (!environment) {
      throw new BadRequestException('Environment not found');
    }

    const statelessWorkflowAllowed = this.isStatelessWorkflowAllowed(command.bridgeUrl);

    if (statelessWorkflowAllowed) {
      const discoveredWorkflow = await this.queryDiscoverWorkflow(command);

      if (!discoveredWorkflow) {
        throw new UnprocessableEntityException('workflow_not_found');
      }

      return await this.dispatchEventToWorkflowQueue({
        command,
        transactionId,
        discoveredWorkflow,
        environment,
        organization,
      });
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

    if (template.validatePayload && template.payloadSchema) {
      const validatedPayload = this.validateAndApplyPayloadDefaults(command.payload, template.payloadSchema);
      // eslint-disable-next-line no-param-reassign
      command.payload = validatedPayload;
    }

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

    const result = await this.dispatchEventToWorkflowQueue({ command, transactionId, environment, organization });

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
        workflowOrigin: ResourceOriginEnum.EXTERNAL,
      })
    )) as ExecuteBridgeRequestDto<GetActionEnum.DISCOVER>;

    return discover?.workflows?.find((findWorkflow) => findWorkflow.workflowId === command.identifier) || null;
  }

  private async dispatchEventToWorkflowQueue({
    command,
    transactionId,
    discoveredWorkflow,
    environment,
    organization,
  }: {
    command: ParseEventRequestMulticastCommand | ParseEventRequestBroadcastCommand;
    transactionId: string;
    discoveredWorkflow?: DiscoverWorkflowOutput | null;
    environment?: EnvironmentEntity;
    organization?: OrganizationEntity;
  }) {
    const commandArgs = {
      ...command,
    };

    const isDryRun = await this.featureFlagService.getFlag({
      environment,
      organization,
      user: { _id: command.userId } as UserEntity,
      key: FeatureFlagsKeysEnum.IS_SUBSCRIBER_ID_VALIDATION_DRY_RUN_ENABLED,
      defaultValue: true,
    });

    if ('to' in commandArgs) {
      const { validRecipients, invalidRecipients } = this.parseRecipients(commandArgs.to);

      if (invalidRecipients.length > 0 && isDryRun) {
        this.logger.warn(
          `[Dry run] Invalid recipients: ${invalidRecipients.map((recipient) => JSON.stringify(recipient)).join(', ')}`
        );
      }

      /**
       * If all the recipients are invalid, we should return with status INVALID_RECIPIENTS,
       * otherwise we should continue with the valid recipients.
       */
      if (!validRecipients && !isDryRun) {
        return {
          acknowledged: true,
          status: TriggerEventStatusEnum.INVALID_RECIPIENTS,
          transactionId,
        };
      }

      if (!isDryRun && validRecipients) {
        commandArgs.to = validRecipients as TriggerRecipientsPayload;
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
      'Event dispatched to [Workflow] Queue'
    );

    return {
      acknowledged: true,
      status: TriggerEventStatusEnum.PROCESSED,
      transactionId,
    };
  }

  private isStatelessWorkflowAllowed(bridgeUrl: string | undefined) {
    if (!bridgeUrl) {
      return false;
    }

    return true;
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
      throw new BadRequestException(`Trigger is missing: ${invalidKeys.join(', ')}`);
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

  /**
   * Validates a single Parent item.
   * @param item - The item to validate
   * @param invalidValues - Array to collect invalid values
   * @returns The valid item or null if invalid
   */
  private validateItem(item: unknown, invalidValues: unknown[]) {
    const result = RecipientSchema.safeParse(item);
    if (result.success) {
      return result.data;
    } else {
      invalidValues.push(item);

      return null;
    }
  }

  /**
   * Parses and validates the recipients from the given input.
   *
   * The input can be a single recipient or an array of recipients. Each recipient can be:
   * - A string that matches the `SUBSCRIBER_ID_REGEX`
   * - An object with a `subscriberId` property that matches the `SUBSCRIBER_ID_REGEX`
   * - An object with a `topicKey` property that matches the `SUBSCRIBER_ID_REGEX`
   *
   * If the input is valid, it returns the parsed data. If the input is an array, it returns an object
   * containing arrays of valid and invalid values. If the input is a single item, it returns an object
   * containing the valid item and an array of invalid values.
   *
   * @param input - The input to parse and validate. Can be a single recipient or an array of recipients.
   * @returns The object containing valid and invalid values.
   */
  private parseRecipients(input: unknown) {
    const invalidValues: unknown[] = [];

    // Try to validate the whole input first
    const parsed = RecipientsSchema.safeParse(input);
    if (parsed.success) {
      return { validRecipients: parsed.data, invalidRecipients: [] };
    }

    // If input is an array, validate each item
    if (Array.isArray(input)) {
      const validValues = input.map((item) => this.validateItem(item, invalidValues)).filter(Boolean);

      return { validRecipients: validValues, invalidRecipients: invalidValues };
    }

    // If input is a single item
    const validItem = this.validateItem(input, invalidValues);

    return { validRecipients: validItem, invalidRecipients: invalidValues };
  }

  private validateAndApplyPayloadDefaults(payload: any, schema: any): any {
    const ajv = new Ajv({
      allErrors: true,
      useDefaults: true,
    });
    addFormats(ajv);

    const validate = ajv.compile(schema);

    // Create a deep copy of the payload to avoid mutating the original
    const payloadWithDefaults = JSON.parse(JSON.stringify(payload));
    const valid = validate(payloadWithDefaults);

    if (!valid && validate.errors) {
      throw PayloadValidationException.fromAjvErrors(validate.errors, payload, schema);
    }

    return payloadWithDefaults;
  }
}
