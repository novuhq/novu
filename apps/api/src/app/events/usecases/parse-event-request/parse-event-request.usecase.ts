import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { EventType, RequestTraceInput } from '@novu/application-generic';
import {
  ExecuteBridgeRequest,
  ExecuteBridgeRequestCommand,
  ExecuteBridgeRequestDto,
  FeatureFlagsService,
  InMemoryLRUCacheService,
  InMemoryLRUCacheStore,
  Instrument,
  InstrumentUsecase,
  IWorkflowDataDto,
  LogRepository,
  mapEventTypeToTitle,
  PinoLogger,
  StorageHelperService,
  TraceLogRepository,
  WorkflowQueueService,
} from '@novu/application-generic';
import {
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  TenantEntity,
  TenantRepository,
  UserEntity,
  WorkflowOverrideEntity,
  WorkflowOverrideRepository,
} from '@novu/dal';
import { DiscoverWorkflowOutput, GetActionEnum } from '@novu/framework/internal';
import {
  FeatureFlagsKeysEnum,
  ResourceOriginEnum,
  TriggerEventStatusEnum,
  TriggerRecipientsPayload,
} from '@novu/shared';
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { generateTransactionId } from '../../../shared/helpers/generate-transaction-id';
import { PayloadValidationException } from '../../exceptions/payload-validation-exception';
import { RecipientSchema, RecipientsSchema } from '../../utils/trigger-recipient-validation';
import {
  ParseEventRequestBroadcastCommand,
  ParseEventRequestCommand,
  ParseEventRequestMulticastCommand,
} from './parse-event-request.command';

const ajv = new Ajv({
  allErrors: true,
  useDefaults: true,
  strict: false,
});
addFormats(ajv);

function getSchemaHash(schema: object): string {
  return createHash('sha256').update(JSON.stringify(schema)).digest('hex');
}

export type ParseEventRequestResult = {
  acknowledged: boolean;
  status: TriggerEventStatusEnum;
  transactionId: string;
  activityFeedLink?: string;
  jobData?: IWorkflowDataDto;
};

@Injectable()
export class ParseEventRequest {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private storageHelperService: StorageHelperService,
    private workflowQueueService: WorkflowQueueService,
    private tenantRepository: TenantRepository,
    private workflowOverrideRepository: WorkflowOverrideRepository,
    private executeBridgeRequest: ExecuteBridgeRequest,
    private logger: PinoLogger,
    private featureFlagService: FeatureFlagsService,
    private traceLogRepository: TraceLogRepository,
    protected moduleRef: ModuleRef,
    private inMemoryLRUCacheService: InMemoryLRUCacheService
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  public async execute(command: ParseEventRequestCommand): Promise<ParseEventRequestResult> {
    const transactionId = command.transactionId || generateTransactionId();
    const requestId = command.requestId;

    try {
      const statelessWorkflowAllowed = this.isStatelessWorkflowAllowed(command.bridgeUrl);

      if (statelessWorkflowAllowed) {
        const discoveredWorkflow = await this.queryDiscoverWorkflow(command);

        if (!discoveredWorkflow) {
          await this.createRequestTrace({
            requestId,
            command,
            eventType: 'request_workflow_not_found',
            transactionId,
            status: 'error',
            message: 'Bridge workflow not found',
          });
          throw new UnprocessableEntityException('workflow_not_found');
        }

        return await this.dispatchEventToWorkflowQueue({
          requestId,
          command,
          transactionId,
          discoveredWorkflow,
        });
      }

      const template: Pick<NotificationTemplateEntity, '_id' | 'active' | 'payloadSchema' | 'validatePayload'> | null =
        command.workflow ||
        (await this.getNotificationTemplateByTriggerIdentifier({
          environmentId: command.environmentId,
          triggerIdentifier: command.identifier,
        }));

      if (!template) {
        await this.createRequestTrace({
          requestId,
          command,
          eventType: 'request_workflow_not_found',
          transactionId,
          status: 'error',
          message: 'Notification template not found',
        });
        throw new UnprocessableEntityException('workflow_not_found');
      }

      if (template.validatePayload && template.payloadSchema) {
        try {
          const validatedPayload = this.validateAndApplyPayloadDefaults(command.payload, template.payloadSchema);
          // eslint-disable-next-line no-param-reassign
          command.payload = validatedPayload;
        } catch (error) {
          if (error instanceof PayloadValidationException) {
            await this.createRequestTrace({
              requestId,
              command,
              eventType: 'request_payload_validation_failed',
              transactionId,
              status: 'error',
              message: 'Payload validation failed',
              rawData: { validationErrors: error.message, payload: command.payload },
            });
          }
          throw error;
        }
      }

      let tenant: Pick<TenantEntity, '_id'> | null = null;
      if (command.tenant) {
        tenant = await this.tenantRepository.findOne(
          {
            _environmentId: command.environmentId,
            identifier: typeof command.tenant === 'string' ? command.tenant : command.tenant.identifier,
          },
          '_id',
          { readPreference: 'secondaryPreferred' }
        );

        if (!tenant) {
          return {
            acknowledged: true,
            status: TriggerEventStatusEnum.TENANT_MISSING,
            transactionId,
          };
        }
      }

      let workflowOverride: Pick<WorkflowOverrideEntity, '_id' | 'active'> | null = null;
      if (tenant) {
        workflowOverride = await this.workflowOverrideRepository.findOne(
          {
            _environmentId: command.environmentId,
            _workflowId: template._id,
            _tenantId: tenant._id,
          },
          '_id active'
        );
      }

      const inactiveWorkflow = !workflowOverride && !template.active;
      const inactiveWorkflowOverride = workflowOverride && !workflowOverride.active;

      if (inactiveWorkflowOverride || inactiveWorkflow) {
        return {
          acknowledged: true,
          status: TriggerEventStatusEnum.NOT_ACTIVE,
          transactionId,
        };
      }

      // Modify Attachment Key Name, Upload attachments to Storage Provider and Remove file from payload
      if (command.payload && Array.isArray(command.payload.attachments)) {
        this.modifyAttachments(command);
        await this.storageHelperService.uploadAttachments(command.payload.attachments);
        // eslint-disable-next-line no-param-reassign
        command.payload.attachments = command.payload.attachments.map(({ file, ...attachment }) => attachment);
      }

      const result = await this.dispatchEventToWorkflowQueue({
        requestId,
        command,
        transactionId,
      });

      return result;
    } catch (error) {
      await this.createRequestTrace({
        requestId,
        command,
        eventType: 'request_failed',
        transactionId,
        status: 'error',
        message: `Request processing failed: ${error.message}`,
        rawData: { error: error.message, stack: error.stack },
      });

      throw error;
    }
  }

  @Instrument()
  private async createRequestTrace({
    requestId,
    command,
    eventType,
    transactionId,
    status = 'success',
    message,
    rawData,
  }: {
    requestId: string | undefined;
    command: ParseEventRequestCommand;
    eventType: EventType;
    transactionId: string;
    status?: 'success' | 'error';
    message?: string;
    rawData?: unknown;
  }): Promise<void> {
    if (!requestId) {
      this.logger.warn(
        { command, eventType, transactionId, status, message, rawData },
        'Request trace skipped, no request ID found'
      );

      return;
    }

    try {
      const traceData: RequestTraceInput = {
        created_at: LogRepository.formatDateTime64(new Date()),
        organization_id: command.organizationId,
        environment_id: command.environmentId,
        user_id: command.userId,
        subscriber_id: '',
        external_subscriber_id: '',
        event_type: eventType,
        title: mapEventTypeToTitle(eventType),
        message: message || '',
        raw_data: rawData ? JSON.stringify(rawData) : '',
        status,
        entity_id: requestId,
        workflow_run_identifier: command.identifier,
        workflow_id: command.workflow?._id || '',
        provider_id: '',
      };

      await this.traceLogRepository.createRequest([traceData]);
    } catch (error) {
      this.logger.error(
        {
          error,
          eventType,
          transactionId,
          organizationId: command.organizationId,
          environmentId: command.environmentId,
        },
        'Failed to create request trace'
      );
    }
  }

  @Instrument()
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

  @Instrument()
  private async dispatchEventToWorkflowQueue({
    requestId,
    command,
    transactionId,
    discoveredWorkflow,
  }: {
    requestId: string;
    command: ParseEventRequestMulticastCommand | ParseEventRequestBroadcastCommand;
    transactionId: string;
    discoveredWorkflow?: DiscoverWorkflowOutput | null;
  }): Promise<ParseEventRequestResult> {
    // biome-ignore lint/correctness/noUnusedVariables: eliminate from queue
    const { workflow, ...commandArgs } = command;

    const isDryRun = await this.featureFlagService.getFlag({
      environment: { _id: command.environmentId },
      organization: { _id: command.organizationId },
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
        await this.createRequestTrace({
          requestId,
          command,
          eventType: 'request_invalid_recipients',
          transactionId,
          status: 'error',
          message: 'All recipients are invalid',
          rawData: { invalidRecipients },
        });

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
      requestId,
    };

    if (!command.skipQueueInsertion) {
      await this.workflowQueueService.add({ name: transactionId, data: jobData, groupId: command.organizationId });
      this.logger.info(
        { ...command, transactionId, discoveredWorkflowId: discoveredWorkflow?.workflowId },
        'Event dispatched to [Workflow] Queue'
      );
    }

    const activityFeedLink = `${process.env.DASHBOARD_URL || process.env.FRONT_BASE_URL}/env/${command.environmentId}/activity/requests?selectedLogId=${requestId}`;
    return {
      acknowledged: true,
      status: TriggerEventStatusEnum.PROCESSED,
      transactionId,
      activityFeedLink,
      jobData: command.skipQueueInsertion ? jobData : undefined,
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
  }): Promise<Pick<NotificationTemplateEntity, '_id' | 'active' | 'payloadSchema' | 'validatePayload'> | null> {
    return await this.notificationTemplateRepository.findOne(
      {
        _environmentId: command.environmentId,
        'triggers.identifier': command.triggerIdentifier,
      },
      '_id active payloadSchema validatePayload',
      { readPreference: 'secondaryPreferred' }
    );
  }

  @Instrument()
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

  /**
   * Validates a single Parent item.
   * @param item - The item to validate
   * @param invalidValues - Array to collect invalid values
   * @returns The valid item or null if invalid
   */
  @Instrument()
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
  @Instrument()
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

  @Instrument()
  private validateAndApplyPayloadDefaults(payload: Record<string, unknown>, schema: object): Record<string, unknown> {
    const validate = this.getCompiledValidator(schema);
    const payloadWithDefaults = JSON.parse(JSON.stringify(payload));
    const valid = validate(payloadWithDefaults);

    if (!valid && validate.errors) {
      throw PayloadValidationException.fromAjvErrors(validate.errors, payload, schema);
    }

    return payloadWithDefaults;
  }

  private getCompiledValidator(schema: object): ValidateFunction {
    const hash = getSchemaHash(schema);
    let validate = this.inMemoryLRUCacheService.getIfCached(InMemoryLRUCacheStore.VALIDATOR, hash) as ValidateFunction;

    if (!validate) {
      validate = ajv.compile(schema);
      this.inMemoryLRUCacheService.set(InMemoryLRUCacheStore.VALIDATOR, hash, validate);
    }

    return validate;
  }
}
