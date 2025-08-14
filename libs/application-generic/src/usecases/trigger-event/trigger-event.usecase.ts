import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  EnvironmentRepository,
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
import { Instrument, InstrumentUsecase } from '../../instrumentation';
import { PinoLogger } from '../../logging';
import type { EventType, Trace } from '../../services/analytic-logs';
import { LogRepository, mapEventTypeToTitle, TraceLogRepository } from '../../services/analytic-logs';
import { AnalyticsService } from '../../services/analytics.service';
import { CreateOrUpdateSubscriberCommand, CreateOrUpdateSubscriberUseCase } from '../create-or-update-subscriber';
import { ProcessTenant, ProcessTenantCommand } from '../process-tenant';
import { TriggerBroadcastCommand } from '../trigger-broadcast/trigger-broadcast.command';
import { TriggerBroadcast } from '../trigger-broadcast/trigger-broadcast.usecase';
import { TriggerMulticast, TriggerMulticastCommand } from '../trigger-multicast';
import { TriggerEventCommand } from './trigger-event.command';

function getActiveWorker() {
  return process.env.ACTIVE_WORKER;
}

@Injectable()
export class TriggerEvent {
  constructor(
    private createOrUpdateSubscriberUsecase: CreateOrUpdateSubscriberUseCase,
    private environmentRepository: EnvironmentRepository,
    private jobRepository: JobRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private processTenant: ProcessTenant,
    private logger: PinoLogger,
    private triggerBroadcast: TriggerBroadcast,
    private triggerMulticast: TriggerMulticast,
    private analyticsService: AnalyticsService,
    private traceLogRepository: TraceLogRepository
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: TriggerEventCommand) {
    await this.createWorkflowTrace(command, 'workflow_execution_started', 'success', 'Workflow execution started');

    try {
      const mappedCommand = {
        ...command,
        tenant: this.mapTenant(command.tenant),
        actor: this.mapActor(command.actor),
      };

      const { environmentId, identifier, organizationId, userId } = mappedCommand;

      const environment = await this.environmentRepository.findOne({
        _id: environmentId,
      });

      if (!environment) {
        throw new BadRequestException('Environment not found');
      }

      this.logger.assign({
        transactionId: mappedCommand.transactionId,
        environmentId: mappedCommand.environmentId,
        organizationId: mappedCommand.organizationId,
      });

      Logger.debug(mappedCommand.actor);

      await this.validateTransactionIdProperty(mappedCommand.transactionId, environmentId);

      addBreadcrumb({
        message: 'Sending trigger',
        data: {
          triggerIdentifier: identifier,
        },
      });

      let storedWorkflow: NotificationTemplateEntity | null = null;
      if (!command.bridgeWorkflow) {
        storedWorkflow = await this.getAndUpdateWorkflowById({
          environmentId: mappedCommand.environmentId,
          triggerIdentifier: mappedCommand.identifier,
          payload: mappedCommand.payload,
          organizationId: mappedCommand.organizationId,
          userId: mappedCommand.userId,
        });
      }

      if (!storedWorkflow && !command.bridgeWorkflow) {
        await this.createWorkflowTrace(
          command,
          'workflow_template_not_found',
          'error',
          'Notification template could not be found',
          { identifier: mappedCommand.identifier }
        );
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
          await this.createWorkflowTrace(
            command,
            'workflow_tenant_processing_failed',
            'warning',
            'Tenant processing failed',
            { tenantIdentifier: mappedCommand.tenant.identifier }
          );
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
        this.logger.info(mappedCommand, 'Processing actor');

        try {
          actorProcessed = await this.createOrUpdateSubscriberUsecase.execute(
            this.buildCommand(environmentId, organizationId, mappedCommand.actor)
          );
        } catch (error: any) {
          await this.createWorkflowTrace(
            command,
            'workflow_actor_processing_failed',
            'error',
            'Actor processing failed',
            { error: error.message, stack: error.stack }
          );
          throw error;
        }
      }

      switch (mappedCommand.addressingType) {
        case AddressingTypeEnum.MULTICAST: {
          await this.triggerMulticast.execute(
            TriggerMulticastCommand.create({
              ...mappedCommand,
              actor: actorProcessed,
              environmentName: environment.name,
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
              environmentName: environment.name,
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
              environmentName: environment.name,
              template: storedWorkflow || (command.bridgeWorkflow as unknown as NotificationTemplateEntity),
            })
          );
          break;
        }
      }
    } catch (e) {
      const error = e as Error;
      await this.createWorkflowTrace(
        command,
        'workflow_execution_failed',
        'error',
        `Workflow execution failed: ${error.message}`,
        { error: error.message, stack: error.stack }
      );

      Logger.error(
        {
          transactionId: command.transactionId,
          organization: command.organizationId,
          triggerIdentifier: command.identifier,
          userId: command.userId,
          error: e,
        },
        'Unexpected error has occurred when triggering event'
      );

      throw e;
    }
  }

  private async createWorkflowTrace(
    command: TriggerEventCommand,
    eventType: EventType,
    status: 'success' | 'error' | 'warning' = 'success',
    message?: string,
    rawData?: any
  ): Promise<void> {
    if (!command.requestId) {
      return;
    }

    try {
      const traceData: Omit<Trace, 'id' | 'expires_at'> = {
        created_at: LogRepository.formatDateTime64(new Date()),
        organization_id: command.organizationId,
        environment_id: command.environmentId,
        user_id: command.userId,
        subscriber_id: null,
        external_subscriber_id: null,
        event_type: eventType,
        title: mapEventTypeToTitle(eventType),
        message: message || null,
        raw_data: rawData ? JSON.stringify(rawData) : null,
        status,
        entity_type: 'request',
        entity_id: command.requestId,
        workflow_run_identifier: command.identifier,
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

    const workflow = await this.notificationTemplateRepository.findByTriggerIdentifierAndUpdate(
      command.environmentId,
      command.triggerIdentifier,
      lastTriggeredAt
    );

    if (workflow) {
      // We only consider trigger when it's coming from the backend SDK
      if (!command.payload?.__source) {
        if (!workflow.lastTriggeredAt) {
          this.analyticsService.track('Workflow Connected to Backend SDK - [API]', command.userId, {
            name: workflow.name,
            origin: workflow.origin,
            _organization: command.organizationId,
            _environment: command.environmentId,
          });
        }

        /**
         * Update the entry to cache it with the new lastTriggeredAt
         */
        workflow.lastTriggeredAt = lastTriggeredAt.toISOString();
      }
    }

    return workflow;
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
}
