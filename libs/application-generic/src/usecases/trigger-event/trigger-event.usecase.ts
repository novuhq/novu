import { Injectable, Logger } from '@nestjs/common';
import { addBreadcrumb } from '@sentry/node';

import {
  IntegrationRepository,
  JobEntity,
  JobRepository,
  NotificationTemplateRepository,
  SubscriberEntity,
  NotificationTemplateEntity,
  EnvironmentRepository,
} from '@novu/dal';
import {
  AddressingTypeEnum,
  ChannelTypeEnum,
  ISubscribersDefine,
  ITenantDefine,
  ProvidersIdEnum,
  TriggerRecipientSubscriber,
  TriggerTenantContext,
} from '@novu/shared';

import { GetActionEnum, PostActionEnum } from '@novu/framework/internal';
import { TriggerEventCommand } from './trigger-event.command';
import {
  ProcessSubscriber,
  ProcessSubscriberCommand,
} from '../process-subscriber';
import { PinoLogger } from '../../logging';
import { Instrument, InstrumentUsecase } from '../../instrumentation';
import {
  buildNotificationTemplateIdentifierKey,
  CachedEntity,
} from '../../services/cache';
import { ApiException } from '../../utils/exceptions';
import { ProcessTenant, ProcessTenantCommand } from '../process-tenant';
import { TriggerBroadcast } from '../trigger-broadcast/trigger-broadcast.usecase';
import { TriggerBroadcastCommand } from '../trigger-broadcast/trigger-broadcast.command';
import {
  TriggerMulticast,
  TriggerMulticastCommand,
} from '../trigger-multicast';

const LOG_CONTEXT = 'TriggerEventUseCase';

export interface IExecuteBridgeRequestCommand {
  bridgeUrl: string;
  payload?: Record<string, unknown>;
  apiKey: string;
  searchParams?: Record<string, string>;
  afterResponse?: any;
  action: GetActionEnum | PostActionEnum;
  retriesLimit?: number;
}

@Injectable()
export class TriggerEvent {
  constructor(
    private processSubscriber: ProcessSubscriber,
    private integrationRepository: IntegrationRepository,
    private environmentRepository: EnvironmentRepository,
    private jobRepository: JobRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private processTenant: ProcessTenant,
    private logger: PinoLogger,
    private triggerBroadcast: TriggerBroadcast,
    private triggerMulticast: TriggerMulticast,
  ) {}

  @InstrumentUsecase()
  async execute(command: TriggerEventCommand) {
    try {
      const mappedCommand = {
        ...command,
        tenant: this.mapTenant(command.tenant),
        actor: this.mapActor(command.actor),
      };

      Logger.debug(mappedCommand.actor);

      const { environmentId, identifier, organizationId, userId } =
        mappedCommand;

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

      this.logger.assign({
        transactionId: mappedCommand.transactionId,
        environmentId: mappedCommand.environmentId,
        organizationId: mappedCommand.organizationId,
      });

      let storedWorkflow: NotificationTemplateEntity | null = null;
      if (!command.bridgeWorkflow) {
        storedWorkflow = await this.getNotificationTemplateByTriggerIdentifier({
          environmentId: mappedCommand.environmentId,
          triggerIdentifier: mappedCommand.identifier,
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

      const environment = await this.environmentRepository.findOne({
        _id: environmentId,
      });

      if (!environment) {
        throw new ApiException('Environment not found');
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
  })
  private async getNotificationTemplateByTriggerIdentifier(command: {
    triggerIdentifier: string;
    environmentId: string;
  }) {
    return await this.notificationTemplateRepository.findByTriggerIdentifier(
      command.environmentId,
      command.triggerIdentifier,
    );
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

  @Instrument()
  private async validateSubscriberIdProperty(
    to: ISubscribersDefine[],
  ): Promise<boolean> {
    for (const subscriber of to) {
      const subscriberIdExists =
        typeof subscriber === 'string' ? subscriber : subscriber.subscriberId;

      if (Array.isArray(subscriberIdExists)) {
        throw new ApiException(
          'subscriberId under property to is type array, which is not allowed please make sure all subscribers ids are strings',
        );
      }

      if (!subscriberIdExists) {
        throw new ApiException(
          'subscriberId under property to is not configured, please make sure all subscribers contains subscriberId property',
        );
      }
    }

    return true;
  }

  @Instrument()
  private async getProviderId(
    environmentId: string,
    channelType: ChannelTypeEnum,
  ): Promise<ProvidersIdEnum> {
    const integration = await this.integrationRepository.findOne(
      {
        _environmentId: environmentId,
        active: true,
        channel: channelType,
      },
      'providerId',
    );

    return integration?.providerId as ProvidersIdEnum;
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
