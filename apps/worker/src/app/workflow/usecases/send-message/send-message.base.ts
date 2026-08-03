import { Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  createProviderSelectedMessage,
  DetailEnum,
  GetNovuProviderCredentials,
  Instrument,
  SelectIntegration,
  SelectIntegrationCommand,
  SelectVariant,
  SelectVariantCommand,
} from '@novu/application-generic';
import {
  IntegrationEntity,
  JobEntity,
  MessageRepository,
  MessageTemplateEntity,
  SubscriberRepository,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  ChatProviderIdEnum,
  EmailProviderIdEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  FCM_ROUTING_KEYS,
  getProviderOverrideConfig,
  ITenantDefine,
  ProvidersIdEnum,
  PushProviderIdEnum,
  providers,
  SmsProviderIdEnum,
  TriggerOverrides,
} from '@novu/shared';
import { format } from 'date-fns';
import i18next from 'i18next';
import { cloneDeep, mergeWith } from 'lodash';
import { PlatformException, TRANSLATIONS_SERVICE } from '../../../shared/utils';
import { SendMessageChannelCommand } from './send-message-channel.command';
import { SendMessageResult, SendMessageStatus, SendMessageType } from './send-message-type.usecase';

/**
 * Never replace this with a plain `merge`: lodash merges arrays element-by-element, so a
 * higher-priority `blocks: [x]` layered over a persisted `blocks: [a, b, c]` would yield
 * `[merge(a, x), b, c]` — a corrupted first element plus two stale ones. An override array is a
 * complete replacement of the list it overrides, so the higher-priority array wins whole.
 *
 * The clone keeps the result detached from the command the way `merge` used to: the merged blob
 * leaves the worker as `bridgeProviderData`, and it is reused across every endpoint of a fan-out.
 */
function replaceArrays(_targetValue: unknown, sourceValue: unknown): unknown[] | undefined {
  if (Array.isArray(sourceValue)) {
    return cloneDeep(sourceValue);
  }

  return undefined;
}

function layerHasGroupKey(layer: Record<string, unknown>, group: readonly string[]): boolean {
  return group.some((key) => Object.prototype.hasOwnProperty.call(layer, key) && layer[key] !== undefined);
}

/**
 * For each exclusive key group, once a higher-precedence layer sets any key in the group, strip
 * every group key from lower layers so a deep-merge cannot leave a mixed destination (e.g. FCM
 * `topic` from bridge + `tokens` from trigger).
 *
 * `layers` is ordered low → high precedence. Returns shallow-cloned layers; originals are untouched.
 */
function applyExclusiveKeyGroups(
  layers: readonly Record<string, unknown>[],
  exclusiveKeyGroups: readonly (readonly string[])[]
): Record<string, unknown>[] {
  if (exclusiveKeyGroups.length === 0) {
    return [...layers];
  }

  const result = layers.map((layer) => ({ ...layer }));

  for (const group of exclusiveKeyGroups) {
    let claimedByHigher = false;

    for (let i = result.length - 1; i >= 0; i -= 1) {
      const layer = result[i];

      if (claimedByHigher) {
        for (const key of group) {
          delete layer[key];
        }
      } else if (layerHasGroupKey(layer, group)) {
        claimedByHigher = true;
      }
    }
  }

  return result;
}

/** Prefer registry `exclusiveKeyGroups`; FCM keeps a local fallback if the config omits them. */
function resolveExclusiveKeyGroups(integrationId: string): readonly (readonly string[])[] {
  const fromRegistry = getProviderOverrideConfig(integrationId)?.exclusiveKeyGroups;

  if (fromRegistry?.length) {
    return fromRegistry;
  }

  if (integrationId === PushProviderIdEnum.FCM) {
    return [FCM_ROUTING_KEYS];
  }

  return [];
}

/**
 * Resolves one provider's overrides from lowest to highest precedence: what the bridge or the
 * dashboard persisted, then the workflow-global trigger override, then the step-scoped one.
 *
 * When the provider declares exclusive key groups (e.g. FCM routing destinations), a higher layer
 * that sets any key in a group evicts all group keys contributed by lower layers before merge.
 */
export function combineProviderOverrides(
  bridgeData: Record<string, any> | null | undefined,
  overrides: TriggerOverrides | undefined,
  stepId: string | undefined,
  integrationId: string
): Record<string, unknown> {
  const bridgeProviderData = bridgeData?.providers?.[integrationId] || {};
  const workflowGlobalProviderOverrides = overrides?.providers?.[integrationId] || {};
  const stepScopedOverrides = stepId ? overrides?.steps?.[stepId]?.providers?.[integrationId] || {} : {};

  const [bridgeLayer, workflowLayer, stepLayer] = applyExclusiveKeyGroups(
    [bridgeProviderData, workflowGlobalProviderOverrides, stepScopedOverrides],
    resolveExclusiveKeyGroups(integrationId)
  );

  return mergeWith({}, bridgeLayer, workflowLayer, stepLayer, replaceArrays);
}

export abstract class SendMessageBase extends SendMessageType {
  abstract readonly channelType: ChannelTypeEnum;
  protected constructor(
    protected messageRepository: MessageRepository,
    protected createExecutionDetails: CreateExecutionDetails,
    protected subscriberRepository: SubscriberRepository,
    protected selectIntegration: SelectIntegration,
    protected getNovuProviderCredentials: GetNovuProviderCredentials,
    protected selectVariant: SelectVariant,
    protected moduleRef: ModuleRef
  ) {
    super(messageRepository, createExecutionDetails);
  }

  @Instrument()
  protected async getIntegration(params: {
    id?: string;
    providerId?: ProvidersIdEnum;
    identifier?: string;
    organizationId: string;
    environmentId: string;
    channelType: ChannelTypeEnum;
    userId: string;
    recipientEmail?: string;
    filterData: {
      tenant: ITenantDefine | undefined;
    };
  }): Promise<IntegrationEntity | undefined> {
    const integration = await this.selectIntegration.execute(SelectIntegrationCommand.create(params));

    if (!integration) {
      return;
    }

    if (
      integration.providerId === EmailProviderIdEnum.Novu ||
      integration.providerId === SmsProviderIdEnum.Novu ||
      integration.providerId === ChatProviderIdEnum.Novu
    ) {
      integration.credentials = await this.getNovuProviderCredentials.execute({
        channelType: this.channelType,
        providerId: integration.providerId,
        environmentId: integration._environmentId,
        organizationId: integration._organizationId,
        userId: params.userId,
        recipientEmail: params.recipientEmail,
      });
    }

    return integration;
  }

  protected storeContent(): boolean {
    return this.channelType === ChannelTypeEnum.IN_APP || process.env.STORE_NOTIFICATION_CONTENT === 'true';
  }

  /**
   * Payload-dedup write policy for a stored message: when enabled, the payload
   * is not persisted on the message and is resolved from the parent
   * notification at read time. When off, the channel's payload is persisted as
   * before. In-app messages keep their own payload and don't use this.
   */
  protected payloadToPersist<T>(command: SendMessageChannelCommand, payload: T): T | undefined {
    return command.isPayloadDedupEnabled ? undefined : payload;
  }

  protected getCompilePayload(compileContext) {
    const { payload, ...rest } = compileContext;

    return { ...payload, ...rest };
  }

  protected async sendErrorHandlebars(job: JobEntity, error: string): Promise<SendMessageResult> {
    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
        detail: DetailEnum.MESSAGE_CONTENT_NOT_GENERATED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.FAILED,
        isTest: false,
        isRetry: false,
        raw: JSON.stringify({ error }),
      })
    );

    return {
      status: SendMessageStatus.FAILED,
      errorMessage: DetailEnum.MESSAGE_CONTENT_NOT_GENERATED,
    };
  }

  @Instrument()
  protected async sendSelectedIntegrationExecution(job: JobEntity, integration: IntegrationEntity) {
    const providerDisplayName = providers.find((el) => el.id === integration?.providerId)?.displayName || 'Unknown';

    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
        detail: createProviderSelectedMessage(providerDisplayName) as DetailEnum,
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

  @Instrument()
  protected async processVariants(command: SendMessageChannelCommand): Promise<MessageTemplateEntity> {
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
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
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

  @Instrument()
  protected async initiateTranslations(environmentId: string, organizationId: string, locale: string | undefined) {
    try {
      if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
        if (!this.moduleRef.get(TRANSLATIONS_SERVICE, { strict: false })) {
          throw new PlatformException('Translation module is not loaded');
        }
        const service = this.moduleRef.get(TRANSLATIONS_SERVICE, { strict: false });
        const { namespaces, resources, defaultLocale } = await service.getTranslationsList(
          environmentId,
          organizationId
        );

        const instance = i18next.createInstance({
          resources,
          ns: namespaces,
          defaultNS: false,
          nsSeparator: '.',
          lng: locale || 'en',
          compatibilityJSON: 'v2',
          fallbackLng: defaultLocale || 'en',
          interpolation: {
            formatSeparator: ',',
            format(value, formatting, lng) {
              if (value && formatting && !Number.isNaN(Date.parse(value))) {
                return format(new Date(value), formatting);
              }

              return String(value ?? '');
            },
          },
        });

        await instance.init();

        return instance;
      }
    } catch (e) {
      Logger.error(e, `Unexpected error while importing enterprise modules`, 'TranslationsService');
    }
  }
}
