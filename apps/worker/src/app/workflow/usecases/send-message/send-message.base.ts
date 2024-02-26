import * as i18next from 'i18next';
import { ModuleRef } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { format } from 'date-fns';
import { IntegrationEntity, JobEntity, MessageRepository, SubscriberRepository } from '@novu/dal';
import {
  ChannelTypeEnum,
  EmailProviderIdEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  IMessageTemplate,
  SmsProviderIdEnum,
} from '@novu/shared';

import {
  DetailEnum,
  SelectIntegration,
  SelectIntegrationCommand,
  GetNovuProviderCredentials,
  SelectVariantCommand,
  SelectVariant,
  ExecutionLogRoute,
  ExecutionLogRouteCommand,
} from '@novu/application-generic';
import { SendMessageType } from './send-message-type.usecase';
import { CreateLog } from '../../../shared/logs';
import { PlatformException } from '../../../shared/utils';
import { SendMessageCommand } from './send-message.command';

export abstract class SendMessageBase extends SendMessageType {
  abstract readonly channelType: ChannelTypeEnum;
  protected constructor(
    protected messageRepository: MessageRepository,
    protected createLogUsecase: CreateLog,
    protected executionLogRoute: ExecutionLogRoute,
    protected subscriberRepository: SubscriberRepository,
    protected selectIntegration: SelectIntegration,
    protected getNovuProviderCredentials: GetNovuProviderCredentials,
    protected selectVariant: SelectVariant,
    protected moduleRef: ModuleRef
  ) {
    super(messageRepository, createLogUsecase, executionLogRoute);
  }

  protected async getIntegration(
    selectIntegrationCommand: SelectIntegrationCommand
  ): Promise<IntegrationEntity | undefined> {
    const integration = await this.selectIntegration.execute(SelectIntegrationCommand.create(selectIntegrationCommand));

    if (!integration) {
      return;
    }

    if (integration.providerId === EmailProviderIdEnum.Novu || integration.providerId === SmsProviderIdEnum.Novu) {
      integration.credentials = await this.getNovuProviderCredentials.execute({
        channelType: integration.channel,
        providerId: integration.providerId,
        environmentId: integration._environmentId,
        organizationId: integration._organizationId,
        userId: selectIntegrationCommand.userId,
      });
    }

    return integration;
  }

  protected storeContent(): boolean {
    return this.channelType === ChannelTypeEnum.IN_APP || process.env.STORE_NOTIFICATION_CONTENT === 'true';
  }

  protected getCompilePayload(compileContext) {
    const { payload, ...rest } = compileContext;

    return { ...payload, ...rest };
  }

  protected async sendErrorHandlebars(job: JobEntity, error: string) {
    await this.executionLogRoute.execute(
      ExecutionLogRouteCommand.create({
        ...ExecutionLogRouteCommand.getDetailsFromJob(job),
        detail: DetailEnum.MESSAGE_CONTENT_NOT_GENERATED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.FAILED,
        isTest: false,
        isRetry: false,
        raw: JSON.stringify({ error }),
      })
    );
  }

  protected async sendSelectedIntegrationExecution(job: JobEntity, integration: IntegrationEntity) {
    await this.executionLogRoute.execute(
      ExecutionLogRouteCommand.create({
        ...ExecutionLogRouteCommand.getDetailsFromJob(job),
        detail: DetailEnum.INTEGRATION_INSTANCE_SELECTED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.PENDING,
        isTest: false,
        isRetry: false,
        raw: JSON.stringify({
          providerId: integration?.providerId,
          identifier: integration?.identifier,
          name: integration?.name,
          _environmentId: integration?._environmentId,
          _id: integration?._id,
        }),
      })
    );
  }

  protected async processVariants(command: SendMessageCommand): Promise<IMessageTemplate> {
    const { messageTemplate, conditions } = await this.selectVariant.execute(
      SelectVariantCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
        step: command.step,
        job: command.job,
        filterData: command.compileContext ?? {},
      })
    );

    if (conditions) {
      await this.executionLogRoute.execute(
        ExecutionLogRouteCommand.create({
          ...ExecutionLogRouteCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.VARIANT_CHOSEN,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.PENDING,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({ conditions }),
        })
      );
    }

    return messageTemplate;
  }

  protected async initiateTranslations(environmentId: string, organizationId: string, locale: string | undefined) {
    try {
      if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
        if (!require('@novu/ee-translation')?.TranslationsService) {
          throw new PlatformException('Translation module is not loaded');
        }
        const service = this.moduleRef.get(require('@novu/ee-translation')?.TranslationsService, { strict: false });
        const { namespaces, resources, defaultLocale } = await service.getTranslationsList(
          environmentId,
          organizationId
        );

        await i18next.init({
          resources,
          ns: namespaces,
          defaultNS: false,
          nsSeparator: '.',
          lng: locale || 'en',
          compatibilityJSON: 'v2',
          fallbackLng: defaultLocale || 'en',
          interpolation: {
            formatSeparator: ',',
            format: function (value, formatting, lng) {
              if (value && formatting && !isNaN(Date.parse(value))) {
                return format(new Date(value), formatting);
              }

              return value.toString();
            },
          },
        });
      }
    } catch (e) {
      Logger.error(e, `Unexpected error while importing enterprise modules`, 'TranslationsService');
    }
  }
}
