import { Injectable, Logger } from '@nestjs/common';
import { addBreadcrumb } from '@sentry/node';

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
import { Instrument, InstrumentUsecase } from '../../instrumentation';
import { PinoLogger } from '../../logging';
import { AnalyticsService } from '../../services/analytics.service';
import {
  buildNotificationTemplateIdentifierKey,
  CachedEntity,
} from '../../services/cache';
import { ApiException } from '../../utils/exceptions';
import {
  ProcessSubscriber,
  ProcessSubscriberCommand,
} from '../process-subscriber';
import { ProcessTenant, ProcessTenantCommand } from '../process-tenant';
import { TriggerBroadcastCommand } from '../trigger-broadcast/trigger-broadcast.command';
import { TriggerBroadcast } from '../trigger-broadcast/trigger-broadcast.usecase';
import {
  TriggerMulticast,
  TriggerMulticastCommand,
} from '../trigger-multicast';
import { TriggerEventCommand } from './trigger-event.command';

const LOG_CONTEXT = 'TriggerEventUseCase';

@Injectable()
export class TriggerEvent {
  constructor(
    private processSubscriber: ProcessSubscriber,
    private environmentRepository: EnvironmentRepository,
    private jobRepository: JobRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private processTenant: ProcessTenant,
    private logger: PinoLogger,
    private triggerBroadcast: TriggerBroadcast,
    private triggerMulticast: TriggerMulticast,
    private analyticsService: AnalyticsService,
  ) {}

  @InstrumentUsecase()
  async execute(command: TriggerEventCommand) {
    try {
      const mappedCommand = {
        ...command,
        tenant: this.mapTenant(command.tenant),
        actor: this.mapActor(command.actor),
      };

      const { environmentId, identifier, organizationId, userId } =
        mappedCommand;

      const environment = await this.environmentRepository.findOne({
        _id: environmentId,
      });

      if (!environment) {
        throw new ApiException('Environment not found');
      }

      this.logger.assign({
        transactionId: mappedCommand.transactionId,
        environmentId: mappedCommand.environmentId,
        organizationId: mappedCommand.organizationId,
      });

      Logger.debug(mappedCommand.actor);

      await this.validateTransactionIdProperty(
        mappedCommand.transactionId,
        environmentId,
      );

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
        throw new ApiException('Notification template could not be found');
      }

      if (mappedCommand.tenant) {
        const tenantProcessed = await this.processTenant.execute(
          ProcessTenantCommand.create({
            environmentId,
            organizationId,
            userId,
            tenant: mappedCommand.tenant,
          }),
        );

        if (!tenantProcessed) {
          Logger.warn(
            `Tenant with identifier ${JSON.stringify(
              mappedCommand.tenant.identifier,
            )} of organization ${mappedCommand.organizationId} in transaction ${
              mappedCommand.transactionId
            } could not be processed.`,
            LOG_CONTEXT,
          );
        }
      }

      // We might have a single actor for every trigger, so we only need to check for it once
      let actorProcessed: SubscriberEntity | undefined;
      if (mappedCommand.actor) {
        actorProcessed = await this.processSubscriber.execute(
          ProcessSubscriberCommand.create({
            environmentId,
            organizationId,
            userId,
            subscriber: mappedCommand.actor,
          }),
        );
      }

      switch (mappedCommand.addressingType) {
        case AddressingTypeEnum.MULTICAST: {
          await this.triggerMulticast.execute(
            TriggerMulticastCommand.create({
              ...mappedCommand,
              actor: actorProcessed,
              environmentName: environment.name,
              template:
                storedWorkflow ||
                (command.bridgeWorkflow as unknown as NotificationTemplateEntity),
            }),
          );
          break;
        }
        case AddressingTypeEnum.BROADCAST: {
          await this.triggerBroadcast.execute(
            TriggerBroadcastCommand.create({
              ...mappedCommand,
              actor: actorProcessed,
              environmentName: environment.name,
              template:
                storedWorkflow ||
                (command.bridgeWorkflow as unknown as NotificationTemplateEntity),
            }),
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
              template:
                storedWorkflow ||
                (command.bridgeWorkflow as unknown as NotificationTemplateEntity),
            }),
          );
          break;
        }
      }
    } catch (e) {
      Logger.error(
        {
          transactionId: command.transactionId,
          organization: command.organizationId,
          triggerIdentifier: command.identifier,
          userId: command.userId,
          error: e,
        },
        'Unexpected error has occurred when triggering event',
        LOG_CONTEXT,
      );

      throw e;
    }
  }

  @CachedEntity({
    builder: (command: { triggerIdentifier: string; environmentId: string }) =>
      buildNotificationTemplateIdentifierKey({
        _environmentId: command.environmentId,
        templateIdentifier: command.triggerIdentifier,
      }),
    options: {
      ttl: 120, // seconds
    },
  })
  private async getAndUpdateWorkflowById(command: {
    triggerIdentifier: string;
    environmentId: string;
    payload: Record<string, any>;
    organizationId: string;
    userId: string;
  }) {
    const lastTriggeredAt = new Date();

    const workflow =
      await this.notificationTemplateRepository.findByTriggerIdentifierAndUpdate(
        command.environmentId,
        command.triggerIdentifier,
        lastTriggeredAt,
      );

    if (workflow) {
      // We only consider trigger when it's coming from the backend SDK
      if (!command.payload?.__source) {
        if (!workflow.lastTriggeredAt) {
          this.analyticsService.track(
            'Workflow Connected to Backend SDK - [API]',
            command.userId,
            {
              name: workflow.name,
              origin: workflow.origin,
              _organization: command.organizationId,
              _environment: command.environmentId,
            },
          );
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
  private async validateTransactionIdProperty(
    transactionId: string,
    environmentId: string,
  ): Promise<void> {
    const found = (await this.jobRepository.findOne(
      {
        transactionId,
        _environmentId: environmentId,
      },
      '_id',
    )) as Pick<JobEntity, '_id'>;

    if (found) {
      throw new ApiException(
        'transactionId property is not unique, please make sure all triggers have a unique transactionId',
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

  private mapActor(
    subscriber: TriggerRecipientSubscriber,
  ): ISubscribersDefine | null {
    if (!subscriber) return null;

    if (typeof subscriber === 'string') {
      return { subscriberId: subscriber };
    }

    return subscriber;
  }
}
