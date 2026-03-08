import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  ContextRepository,
  JobEntity,
  JobRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  SubscriberEntity,
} from '@novu/dal';
import {
  AddressingTypeEnum,
  ISubscribersDefine,
  ITenantDefine,
  TriggerRecipientSubscriber,
  TriggerTenantContext,
} from '@novu/shared';
import { addBreadcrumb } from '@sentry/node';
import { toMerged } from 'es-toolkit';
import { Instrument, InstrumentUsecase } from '../../instrumentation';
import { PinoLogger } from '../../logging';
import type { EventType, RequestTraceInput } from '../../services/analytic-logs';
import { LogRepository, mapEventTypeToTitle, TraceLogRepository } from '../../services/analytic-logs';
import { AnalyticsService } from '../../services/analytics.service';
import { FeatureFlagsService } from '../../services/feature-flags';
import { InMemoryLRUCacheService, InMemoryLRUCacheStore } from '../../services/in-memory-lru-cache';
import { CreateOrUpdateSubscriberCommand, CreateOrUpdateSubscriberUseCase } from '../create-or-update-subscriber';
import { ProcessTenant, ProcessTenantCommand } from '../process-tenant';
import { TriggerBroadcastCommand } from '../trigger-broadcast/trigger-broadcast.command';
import { TriggerBroadcast } from '../trigger-broadcast/trigger-broadcast.usecase';
import { TriggerMulticast, TriggerMulticastCommand } from '../trigger-multicast';
import { VerifyPayload, VerifyPayloadCommand } from '../verify-payload';
import { TriggerEventCommand } from './trigger-event.command';

function getActiveWorker() {
  return process.env.ACTIVE_WORKER;
}

@Injectable()
export class TriggerEvent {
  constructor(
    private createOrUpdateSubscriberUsecase: CreateOrUpdateSubscriberUseCase,
    private jobRepository: JobRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private processTenant: ProcessTenant,
    private logger: PinoLogger,
    private triggerBroadcast: TriggerBroadcast,
    private triggerMulticast: TriggerMulticast,
    private analyticsService: AnalyticsService,
    private traceLogRepository: TraceLogRepository,
    private contextRepository: ContextRepository,
    private verifyPayload: VerifyPayload,
    private featureFlagsService: FeatureFlagsService,
    private inMemoryLRUCacheService: InMemoryLRUCacheService
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: TriggerEventCommand) {
    let storedWorkflow: NotificationTemplateEntity | null = null;

    try {
      if (!command.bridgeWorkflow) {
        storedWorkflow = await this.getAndUpdateWorkflowById({
          environmentId: command.environmentId,
          triggerIdentifier: command.identifier,
          payload: command.payload,
          organizationId: command.organizationId,
          userId: command.userId,
        });
      }

      if (storedWorkflow) {
        const defaultPayload = this.verifyPayload.execute(
          VerifyPayloadCommand.create({
            payload: command.payload,
            template: storedWorkflow,
          })
        );

        command.payload = toMerged(defaultPayload, command.payload);
      }

      const mappedCommand = await this.getMappedCommand(command, storedWorkflow?._id);

      await this.createWorkflowTrace({
        command,
        eventType: 'workflow_execution_started',
        status: 'success',
        message: 'Workflow execution started',
        workflowId: storedWorkflow?._id,
      });

      const { environmentId, identifier, organizationId, userId } = mappedCommand;

      this.logger.assign({
        transactionId: mappedCommand.transactionId,
        environmentId: mappedCommand.environmentId,
        organizationId: mappedCommand.organizationId,
        contextKeys: mappedCommand.contextKeys,
      });

      Logger.debug(mappedCommand.actor);

      await this.validateTransactionIdProperty(mappedCommand.transactionId, environmentId);

      addBreadcrumb({
        message: 'Sending trigger',
        data: {
          triggerIdentifier: identifier,
        },
      });

      if (!storedWorkflow && !command.bridgeWorkflow) {
        await this.createWorkflowTrace({
          command,
          eventType: 'workflow_template_not_found',
          status: 'error',
          message: 'Notification template could not be found',
          rawData: { identifier: mappedCommand.identifier },
          workflowId: storedWorkflow?._id,
        });
        throw new BadRequestException('Notification template could not be found');
      }

      if (mappedCommand.tenant) {
        const tenantProcessed = await this.processTenant.execute(
          ProcessTenantCommand.create({
            environmentId,
            organizationId,
            userId,
            tenant: mappedCommand.tenant,
          })
        );

        if (!tenantProcessed) {
          await this.createWorkflowTrace({
            command,
            eventType: 'workflow_tenant_processing_failed',
            status: 'warning',
            message: 'Tenant processing failed',
            rawData: { tenantIdentifier: mappedCommand.tenant.identifier },
            workflowId: storedWorkflow?._id,
          });
          Logger.warn(
            `Tenant with identifier ${JSON.stringify(
              mappedCommand.tenant.identifier
            )} of organization ${mappedCommand.organizationId} in transaction ${
              mappedCommand.transactionId
            } could not be processed.`
          );
        }
      }

      // We might have a single actor for every trigger, so we only need to check for it once
      let actorProcessed: SubscriberEntity | undefined;
      if (mappedCommand.actor) {
        this.logger.debug(mappedCommand, 'Processing actor');

        try {
          actorProcessed = await this.createOrUpdateSubscriberUsecase.execute(
            this.buildCommand(environmentId, organizationId, mappedCommand.actor)
          );
        } catch (error: any) {
          await this.createWorkflowTrace({
            command,
            eventType: 'workflow_actor_processing_failed',
            status: 'error',
            message: 'Actor processing failed',
            rawData: { error: error.message, stack: error.stack },
            workflowId: storedWorkflow?._id,
          });
          throw error;
        }
      }

      switch (mappedCommand.addressingType) {
        case AddressingTypeEnum.MULTICAST: {
          await this.triggerMulticast.execute(
            TriggerMulticastCommand.create({
              ...mappedCommand,
              actor: actorProcessed,
              template: storedWorkflow || (command.bridgeWorkflow as unknown as NotificationTemplateEntity),
            })
          );
          break;
        }
        case AddressingTypeEnum.BROADCAST: {
          await this.triggerBroadcast.execute(
            TriggerBroadcastCommand.create({
              ...mappedCommand,
              actor: actorProcessed,
              template: storedWorkflow || (command.bridgeWorkflow as unknown as NotificationTemplateEntity),
            })
          );
          break;
        }
        default: {
          await this.triggerMulticast.execute(
            TriggerMulticastCommand.create({
              addressingType: AddressingTypeEnum.MULTICAST,
              ...(mappedCommand as TriggerMulticastCommand),
              actor: actorProcessed,
              template: storedWorkflow || (command.bridgeWorkflow as unknown as NotificationTemplateEntity),
            })
          );
          break;
        }
      }
    } catch (e) {
      const error = e as Error;
      const isBadRequest = e instanceof BadRequestException;

      await this.createWorkflowTrace({
        command,
        eventType: 'workflow_execution_failed',
        status: 'error',
        message: `Workflow execution failed: ${error.message}`,
        rawData: { error: error.message, stack: error.stack },
        workflowId: storedWorkflow?._id,
      });

      const logPayload = {
        transactionId: command.transactionId,
        organization: command.organizationId,
        triggerIdentifier: command.identifier,
        userId: command.userId,
        error: e,
      };

      if (isBadRequest) {
        Logger.debug(logPayload, 'Bad request when triggering event');
      } else {
        Logger.error(logPayload, 'Unexpected error has occurred when triggering event');
      }

      throw e;
    }
  }

  private async getMappedCommand(command: TriggerEventCommand, workflowId: string) {
    return {
      ...command,
      tenant: this.mapTenant(command.tenant),
      actor: this.mapActor(command.actor),
      contextKeys: await this.resolveContextKeys(command, workflowId),
    };
  }

  private async createWorkflowTrace(params: {
    command: TriggerEventCommand;
    eventType: EventType;
    status?: 'success' | 'error' | 'warning';
    message?: string;
    rawData?: unknown;
    workflowId?: string;
  }): Promise<void> {
    const { command, eventType, status = 'success', message, rawData, workflowId } = params;

    if (!command.requestId) {
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
        entity_id: command.requestId,
        workflow_run_identifier: command.identifier,
        workflow_id: workflowId || '',
        provider_id: '',
      };

      await this.traceLogRepository.createRequest([traceData]);
    } catch (error) {
      this.logger.error(
        {
          error,
          eventType,
          transactionId: command.transactionId,
          organizationId: command.organizationId,
          environmentId: command.environmentId,
        },
        'Failed to create workflow trace'
      );
    }
  }

  private buildCommand(
    environmentId: string,
    organizationId: string,
    subscriberPayload: ISubscribersDefine
  ): CreateOrUpdateSubscriberCommand {
    return CreateOrUpdateSubscriberCommand.create({
      environmentId,
      organizationId,
      subscriberId: subscriberPayload?.subscriberId,
      email: subscriberPayload?.email,
      firstName: subscriberPayload?.firstName,
      lastName: subscriberPayload?.lastName,
      phone: subscriberPayload?.phone,
      avatar: subscriberPayload?.avatar,
      locale: subscriberPayload?.locale,
      data: subscriberPayload?.data,
      channels: subscriberPayload?.channels,
      activeWorkerName: getActiveWorker(),
    });
  }

  private async getAndUpdateWorkflowById(command: {
    triggerIdentifier: string;
    environmentId: string;
    payload: Record<string, any>;
    organizationId: string;
    userId: string;
  }) {
    const lastTriggeredAt = new Date();

    const workflow = await this.findWorkflowByTriggerIdentifier(
      command.triggerIdentifier,
      command.environmentId,
      command.organizationId,
      command.payload?.__source
    );

    if (workflow) {
      const isBackendSDK = !command.payload?.__source;

      if (isBackendSDK) {
        if (!workflow.lastTriggeredAt) {
          this.analyticsService.track('Workflow Connected to Backend SDK - [API]', command.userId, {
            name: workflow.name,
            origin: workflow.origin,
            _organization: command.organizationId,
            _environment: command.environmentId,
          });
        }

        const shouldUpdate =
          !workflow.lastTriggeredAt ||
          new Date(workflow.lastTriggeredAt).getTime() < lastTriggeredAt.getTime() - 5 * 60 * 1000;

        if (shouldUpdate) {
          const previousLastTriggeredAt = workflow.lastTriggeredAt ? new Date(workflow.lastTriggeredAt) : null;

          this.notificationTemplateRepository.updateLastTriggeredAt(
            command.environmentId,
            command.triggerIdentifier,
            lastTriggeredAt,
            previousLastTriggeredAt
          );
        }

        workflow.lastTriggeredAt = lastTriggeredAt.toISOString();
      }
    }

    return workflow;
  }

  @Instrument()
  private async findWorkflowByTriggerIdentifier(
    triggerIdentifier: string,
    environmentId: string,
    organizationId: string,
    source?: string
  ): Promise<NotificationTemplateEntity | null> {
    return this.inMemoryLRUCacheService.get(
      InMemoryLRUCacheStore.WORKFLOW,
      `${environmentId}:${triggerIdentifier}`,
      () => this.notificationTemplateRepository.findByTriggerIdentifier(environmentId, triggerIdentifier),
      {
        environmentId,
        organizationId,
        skipCache: !!source,
      }
    );
  }

  @Instrument()
  private async validateTransactionIdProperty(transactionId: string, environmentId: string): Promise<void> {
    const found = (await this.jobRepository.findOne(
      {
        transactionId,
        _environmentId: environmentId,
      },
      '_id'
    )) as Pick<JobEntity, '_id'>;

    if (found) {
      throw new BadRequestException(
        'transactionId property is not unique, please make sure all triggers have a unique transactionId'
      );
    }
  }

  private mapTenant(tenant: TriggerTenantContext): ITenantDefine | null {
    if (!tenant) return null;

    if (typeof tenant === 'string') {
      return { identifier: tenant };
    }

    return tenant;
  }

  private mapActor(subscriber: TriggerRecipientSubscriber): ISubscribersDefine | null {
    if (!subscriber) return null;

    if (typeof subscriber === 'string') {
      return { subscriberId: subscriber };
    }

    return subscriber;
  }

  private async resolveContextKeys(command: TriggerEventCommand, workflowId: string): Promise<string[]> {
    if (!command.context) {
      return [];
    }

    try {
      const contexts = await this.contextRepository.findOrCreateContextsFromPayload(
        command.environmentId,
        command.organizationId,
        command.context
      );

      this.createWorkflowTrace({
        command,
        eventType: 'workflow_context_resolution_completed',
        status: 'success',
        message: 'Context resolved',
        rawData: {
          context: contexts.map((context) => ({
            id: context.id,
            type: context.type,
            data: context.data,
            createdAt: context.createdAt,
            updatedAt: context.updatedAt,
          })),
        },
        workflowId,
      });

      return contexts.map((context) => context.key);
    } catch (error) {
      this.logger.error(
        {
          error,
          transactionId: command.transactionId,
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          context: command.context,
        },
        'Failed to resolve context'
      );

      if (error instanceof BadRequestException) {
        this.createWorkflowTrace({
          command,
          eventType: 'workflow_context_resolution_failed',
          status: 'error',
          message: 'Context resolution failed',
          rawData: { context: command.context },
          workflowId,
        });
      }
      throw new BadRequestException(
        `Failed to resolve context: ${error instanceof Error ? error.message : String(error)} | Context: ${JSON.stringify(command.context)}`
      );
    }
  }
}
