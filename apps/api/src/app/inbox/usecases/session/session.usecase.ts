import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { differenceInHours } from 'date-fns';
import {
  AnalyticsService,
  CreateOrUpdateSubscriberCommand,
  CreateOrUpdateSubscriberUseCase,
  encryptApiKey,
  LogDecorator,
  PinoLogger,
  SelectIntegration,
  SelectIntegrationCommand,
  shortId,
  UpsertControlValuesUseCase,
  UpsertControlValuesCommand,
  FeatureFlagsService,
  generateTimestampHex,
} from '@novu/application-generic';
import {
  CommunityOrganizationRepository,
  CommunityUserRepository,
  EnvironmentEntity,
  EnvironmentRepository,
  IntegrationRepository,
  NotificationTemplateRepository,
  MessageTemplateRepository,
  PreferencesRepository,
} from '@novu/dal';
import {
  ApiServiceLevelEnum,
  ChannelTypeEnum,
  FeatureNameEnum,
  getFeatureForTierAsNumber,
  InAppProviderIdEnum,
  CustomDataType,
  ResourceTypeEnum,
  ResourceOriginEnum,
  StepTypeEnum,
  PreferencesTypeEnum,
  FeatureFlagsKeysEnum,
  ControlValuesLevelEnum,
} from '@novu/shared';
import { AuthService } from '../../../auth/services/auth.service';
import { SubscriberSessionResponseDto } from '../../dtos/subscriber-session-response.dto';
import { SubscriberDto, SubscriberSessionRequestDto } from '../../dtos/subscriber-session-request.dto';
import { AnalyticsEventsEnum } from '../../utils';
import { validateHmacEncryption } from '../../utils/encryption';
import { NotificationsCountCommand } from '../notifications-count/notifications-count.command';
import { NotificationsCount } from '../notifications-count/notifications-count.usecase';
import { SessionCommand } from './session.command';
import { isHmacValid } from '../../../shared/helpers/is-valid-hmac';
import { EnvironmentResponseDto } from '../../../environments-v1/dtos/environment-response.dto';
import { CreateNovuIntegrations } from '../../../integrations/usecases/create-novu-integrations/create-novu-integrations.usecase';
import { GenerateUniqueApiKey } from '../../../environments-v1/usecases/generate-unique-api-key/generate-unique-api-key.usecase';
import { CreateNovuIntegrationsCommand } from '../../../integrations/usecases/create-novu-integrations/create-novu-integrations.command';
import { GetOrganizationSettings } from '../../../organization/usecases/get-organization-settings/get-organization-settings.usecase';
import { GetOrganizationSettingsCommand } from '../../../organization/usecases/get-organization-settings/get-organization-settings.command';

const ALLOWED_ORIGINS_REGEX = new RegExp(process.env.FRONT_BASE_URL || '');
const KEYLESS_RETENTION_TIME_IN_HOURS = parseInt(process.env.KEYLESS_RETENTION_TIME_IN_HOURS || '', 10) || 24;

@Injectable()
export class Session {
  private readonly KEYLESS_ENVIRONMENT_PREFIX = 'pk_keyless_';

  constructor(
    private environmentRepository: EnvironmentRepository,
    private createSubscriber: CreateOrUpdateSubscriberUseCase,
    private authService: AuthService,
    private selectIntegration: SelectIntegration,
    private analyticsService: AnalyticsService,
    private notificationsCount: NotificationsCount,
    private integrationRepository: IntegrationRepository,
    private organizationRepository: CommunityOrganizationRepository,
    private communityOrganizationRepository: CommunityOrganizationRepository,
    private generateUniqueApiKey: GenerateUniqueApiKey,
    private createNovuIntegrationsUsecase: CreateNovuIntegrations,
    private communityUserRepository: CommunityUserRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private messageTemplateRepository: MessageTemplateRepository,
    private preferencesRepository: PreferencesRepository,
    private upsertControlValuesUseCase: UpsertControlValuesUseCase,
    private getOrganizationSettingsUsecase: GetOrganizationSettings,
    private logger: PinoLogger,
    private featureFlagsService: FeatureFlagsService
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @LogDecorator()
  async execute(command: SessionCommand): Promise<SubscriberSessionResponseDto> {
    this.validateRequestData(command.requestData);

    const subscriber = this.buildPlatformSubscriber(command.requestData);
    const applicationIdentifier = await this.getApplicationIdentifier(command.requestData);

    const environment = await this.environmentRepository.findEnvironmentByIdentifier(applicationIdentifier);
    if (!environment) {
      throw new BadRequestException('Please provide a valid application identifier');
    }

    const inAppIntegration = await this.selectIntegration.execute(
      SelectIntegrationCommand.create({
        environmentId: environment._id,
        organizationId: environment._organizationId,
        channelType: ChannelTypeEnum.IN_APP,
        providerId: InAppProviderIdEnum.Novu,
        filterData: {},
      })
    );

    if (!inAppIntegration) {
      throw new NotFoundException('The active in-app integration could not be found');
    }

    if (inAppIntegration.credentials.hmac) {
      validateHmacEncryption({
        apiKey: environment.apiKeys[0].key,
        subscriberId: subscriber.subscriberId,
        subscriberHash: command.requestData.subscriberHash,
      });
    }

    const subscriberEntity = await this.createSubscriber.execute(
      CreateOrUpdateSubscriberCommand.create({
        environmentId: environment._id,
        organizationId: environment._organizationId,
        subscriberId: subscriber.subscriberId,
        firstName: subscriber.firstName,
        lastName: subscriber.lastName,
        phone: subscriber.phone,
        email: subscriber.email,
        avatar: subscriber.avatar,
        data: subscriber.data as CustomDataType,
        timezone: subscriber.timezone,
        allowUpdate: isHmacValid(
          environment.apiKeys[0].key,
          subscriber.subscriberId,
          command.requestData.subscriberHash
        ),
      })
    );

    this.analyticsService.mixpanelTrack(AnalyticsEventsEnum.SESSION_INITIALIZED, '', {
      _organization: environment._organizationId,
      environmentName: environment.name,
      _subscriber: subscriberEntity._id,
      origin: command.requestData.applicationIdentifier ? command.origin : 'keyless',
    });

    const { data } = await this.notificationsCount.execute(
      NotificationsCountCommand.create({
        organizationId: environment._organizationId,
        environmentId: environment._id,
        subscriberId: subscriber.subscriberId,
        filters: [{ read: false, snoozed: false }],
      })
    );
    const [{ count: totalUnreadCount }] = data;

    const token = await this.authService.getSubscriberWidgetToken(subscriberEntity);

    const { removeNovuBranding } = await this.getOrganizationSettingsUsecase.execute(
      GetOrganizationSettingsCommand.create({
        organizationId: environment._organizationId,
      })
    );

    const maxSnoozeDurationHours = await this.getMaxSnoozeDurationHours(environment);

    /**
     * We want to prevent the playground inbox demo from marking the integration as connected
     * And only treat the real customer domain or local environment as valid origins
     */
    const isOriginFromNovu = ALLOWED_ORIGINS_REGEX.test(command.origin ?? '');
    if (!isOriginFromNovu && !inAppIntegration.connected) {
      this.analyticsService.mixpanelTrack(AnalyticsEventsEnum.INBOX_CONNECTED, '', {
        _organization: environment._organizationId,
        environmentName: environment.name,
      });

      await this.integrationRepository.updateOne(
        {
          _id: inAppIntegration._id,
          _organizationId: environment._organizationId,
          _environmentId: environment._id,
        },
        {
          $set: {
            connected: true,
          },
        }
      );
    }

    return {
      applicationIdentifier: environment.identifier,
      token,
      totalUnreadCount,
      removeNovuBranding,
      maxSnoozeDurationHours,
      isDevelopmentMode: environment.name.toLowerCase() !== 'production',
    };
  }

  private validateRequestData(requestData: SubscriberSessionRequestDto): void {
    if (!requestData.applicationIdentifier && this.extractSubscriberInfo(requestData, true)?.subscriberId) {
      throw new UnprocessableEntityException(
        'A valid application identifier is required when providing subscriber information'
      );
    }
  }

  private buildPlatformSubscriber(requestData: SubscriberSessionRequestDto): SubscriberDto {
    if (!requestData.applicationIdentifier || this.isKeylessApplication(requestData.applicationIdentifier)) {
      return { subscriberId: 'keyless-subscriber-id' };
    }

    return this.extractSubscriberInfo(requestData);
  }

  private isKeylessApplication(applicationIdentifier: string): boolean {
    return applicationIdentifier.startsWith(this.KEYLESS_ENVIRONMENT_PREFIX);
  }

  private extractSubscriberInfo(requestData: SubscriberSessionRequestDto): SubscriberDto;
  private extractSubscriberInfo(requestData: SubscriberSessionRequestDto, safe: true): SubscriberDto | null;
  private extractSubscriberInfo(requestData: SubscriberSessionRequestDto, safe: boolean = false): SubscriberDto | null {
    const subscriber: SubscriberDto | null = this.normalizeSubscriber(requestData.subscriber);

    if (subscriber?.subscriberId) {
      return subscriber;
    }

    // TODO: Backward compatibility support - remove in future versions (see NV-5801)
    if (requestData.subscriberId) {
      return { subscriberId: requestData.subscriberId };
    }

    if (safe) {
      return null;
    }

    throw new UnprocessableEntityException('Subscriber ID is required');
  }

  private normalizeSubscriber(subscriber: string | SubscriberDto | null | undefined): SubscriberDto | null {
    if (!subscriber) {
      return null;
    }

    if (typeof subscriber === 'string') {
      return { subscriberId: subscriber };
    }

    return subscriber;
  }

  private async getApplicationIdentifier(requestData: SubscriberSessionRequestDto): Promise<string> {
    const isKeylessInitialize = !requestData.applicationIdentifier;
    const isKeyless = requestData.applicationIdentifier?.includes(this.KEYLESS_ENVIRONMENT_PREFIX);
    const isKeylessExpired = isKeyless ? await this.isKeylessExpired(requestData.applicationIdentifier) : false;

    const applicationIdentifier =
      isKeylessInitialize || isKeylessExpired
        ? (await this.processKeyless()).identifier
        : requestData.applicationIdentifier;

    return applicationIdentifier;
  }

  private async getMaxSnoozeDurationHours(environment: EnvironmentEntity) {
    if (process.env.NOVU_ENTERPRISE !== 'true') {
      return 0;
    }

    const organization = await this.organizationRepository.findOne({
      _id: environment._organizationId,
    });

    const tierLimitMs = getFeatureForTierAsNumber(
      FeatureNameEnum.PLATFORM_MAX_SNOOZE_DURATION,
      organization?.apiServiceLevel || ApiServiceLevelEnum.FREE,
      true
    );

    return tierLimitMs / 1000 / 60 / 60;
  }

  async isKeylessExpired(applicationIdentifier: string | undefined) {
    if (!applicationIdentifier) {
      return true; // If no identifier is provided, consider it expired
    }

    const parts = applicationIdentifier.replace(this.KEYLESS_ENVIRONMENT_PREFIX, '').split('_');
    if (parts.length < 1) {
      return true; // Invalid format, consider expired
    }

    const createdDate = parts[0];

    if (!createdDate || createdDate.length < 8) {
      // Ensure we have at least 4 bytes (8 hex chars)
      return true; // Invalid timestamp format, consider expired
    }

    try {
      const createdDateTimestamp = timestampHexToDate(createdDate);
      const now = new Date();
      const diffTimeInHours = differenceInHours(now, createdDateTimestamp);

      if (diffTimeInHours > KEYLESS_RETENTION_TIME_IN_HOURS) {
        return true;
      }
    } catch (error) {
      this.logger.error({ err: error }, 'Error parsing timestamp');

      // If there's any error parsing the timestamp, consider it expired
      return true;
    }

    return false;
  }

  async processKeyless(): Promise<EnvironmentResponseDto> {
    if (process.env.NOVU_ENTERPRISE !== 'true') {
      throw new BadRequestException('Keyless is not supported in community edition');
    }

    const organization = await this.communityOrganizationRepository.findById(process.env.KEYLESS_ORGANIZATION_ID!);

    if (!organization) {
      this.logger.error('Keyless Organization not found');
      throw new InternalServerErrorException('Keyless Organization not found');
    }

    const isKeylessEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_KEYLESS_ENVIRONMENT_CREATION_ENABLED,
      defaultValue: false,
      organization,
    });

    if (!isKeylessEnabled) {
      throw new BadRequestException('Keyless environment creation is currently disabled.');
    }

    const user = await this.communityUserRepository.findByEmail(process.env.KEYLESS_USER_EMAIL!);

    if (!user) {
      throw new InternalServerErrorException('Keyless User not found');
    }

    const key = `sk_${await this.generateUniqueApiKey.execute()}`;
    const encryptedApiKey = encryptApiKey(key);
    const hashedApiKey = createHash('sha256').update(key).digest('hex');

    const encodedDate = generateTimestampHex();
    const identifier = `${this.KEYLESS_ENVIRONMENT_PREFIX}${encodedDate}_${shortId(4)}`;
    const environment = await this.environmentRepository.create({
      _organizationId: organization._id,
      name: `Keyless ${new Date().toISOString()}`,
      identifier,
      apiKeys: [
        {
          key: encryptedApiKey,
          _userId: user._id,
          hash: hashedApiKey,
        },
      ],
    });

    await this.createNovuIntegrationsUsecase.execute(
      CreateNovuIntegrationsCommand.create({
        environmentId: environment._id,
        organizationId: environment._organizationId,
        userId: user._id,
        name: 'Keyless Integration',
        channels: [ChannelTypeEnum.IN_APP],
      })
    );

    await this.createWorkflowsUsecase(environment._id, environment._organizationId, user._id);

    const environmentDto = this.convertEnvironmentEntityToDto(environment);

    this.logger.info('Keyless environment created successfully');

    return environmentDto;
  }

  async createWorkflowsUsecase(environmentId: string, organizationId: string, userId: string) {
    const inAppTemplate = await this.messageTemplateRepository.create({
      type: StepTypeEnum.IN_APP,
      content: '',
      avatar: 'https://dashboard.novu.co/images/info.svg',
      _environmentId: environmentId,
      _organizationId: organizationId,
      _creatorId: userId,
      active: true,
      name: 'In-App Notification',
      controls: {
        schema: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
            },
            body: {
              type: 'string',
            },
            skip: {
              type: 'object',
            },
            disableOutputSanitization: {
              type: 'boolean',
            },
            avatar: {
              type: 'string',
              pattern:
                '^(?:\\{\\{[^}]*\\}\\}.*|(?!mailto:)(?:https?:\\/\\/[^\\s/$.?#][^\\s]*(?:\\{\\{[^}]*\\}\\})*[^\\s]*)|\\/[^\\s]*(?:\\{\\{[^}]*\\}\\})*[^\\s]*)$',
            },
            primaryAction: {
              type: 'object',
              properties: {
                label: {
                  type: 'string',
                },
                redirect: {
                  type: 'object',
                  properties: {
                    url: {
                      type: 'string',
                      pattern:
                        '^(?:\\{\\{[^}]*\\}\\}.*|(?!mailto:)(?:https?:\\/\\/[^\\s/$.?#][^\\s]*(?:\\{\\{[^}]*\\}\\})*[^\\s]*)|\\/[^\\s]*(?:\\{\\{[^}]*\\}\\})*[^\\s]*)$',
                    },
                    target: {
                      type: 'string',
                      enum: ['_self', '_blank', '_parent', '_top', '_unfencedTop'],
                    },
                  },
                  required: ['url', 'target'],
                  additionalProperties: false,
                },
              },
              required: ['label'],
              additionalProperties: false,
            },
            secondaryAction: {
              type: 'object',
              properties: {
                label: {
                  type: 'string',
                },
                redirect: {
                  type: 'object',
                  properties: {
                    url: {
                      type: 'string',
                      pattern:
                        '^(?:\\{\\{[^}]*\\}\\}.*|(?!mailto:)(?:https?:\\/\\/[^\\s/$.?#][^\\s]*(?:\\{\\{[^}]*\\}\\})*[^\\s]*)|\\/[^\\s]*(?:\\{\\{[^}]*\\}\\})*[^\\s]*)$',
                    },
                    target: {
                      type: 'string',
                      enum: ['_self', '_blank', '_parent', '_top', '_unfencedTop'],
                    },
                  },
                  required: ['url', 'target'],
                  additionalProperties: false,
                },
              },
              required: ['label'],
              additionalProperties: false,
            },
            data: {
              type: 'object',
            },
            redirect: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  pattern:
                    '^(?:\\{\\{[^}]*\\}\\}.*|(?!mailto:)(?:https?:\\/\\/[^\\s/$.?#][^\\s]*(?:\\{\\{[^}]*\\}\\})*[^\\s]*)|\\/[^\\s]*(?:\\{\\{[^}]*\\}\\})*[^\\s]*)$',
                },
                target: {
                  type: 'string',
                  enum: ['_self', '_blank', '_parent', '_top', '_unfencedTop'],
                },
              },
              required: ['url', 'target'],
              additionalProperties: false,
            },
          },
          additionalProperties: false,
        },
        uiSchema: {
          group: 'IN_APP',
          properties: {
            body: {
              component: 'IN_APP_BODY',
              placeholder: '',
            },
            avatar: {
              component: 'IN_APP_AVATAR',
              placeholder: 'https://dashboard.novu.co/images/info.svg',
            },
            subject: {
              component: 'IN_APP_PRIMARY_SUBJECT',
              placeholder: '',
            },
            primaryAction: {
              component: 'IN_APP_BUTTON_DROPDOWN',
              placeholder: null,
            },
            secondaryAction: {
              component: 'IN_APP_BUTTON_DROPDOWN',
              placeholder: null,
            },
            redirect: {
              component: 'URL_TEXT_BOX',
              placeholder: {
                url: {
                  placeholder: '',
                },
                target: {
                  placeholder: '_self',
                },
              },
            },
            skip: {
              component: 'QUERY_EDITOR',
            },
            disableOutputSanitization: {
              component: 'IN_APP_DISABLE_SANITIZATION_SWITCH',
              placeholder: false,
            },
            data: {
              component: 'DATA',
              placeholder: null,
            },
          },
        },
      },
    });

    const workflow = await this.notificationTemplateRepository.create({
      _environmentId: environmentId,
      _organizationId: organizationId,
      _creatorId: userId,
      name: 'Hello World!',
      description: 'A hello world workflow',
      active: true,
      draft: false,
      critical: false,
      tags: [],
      type: ResourceTypeEnum.BRIDGE,
      origin: ResourceOriginEnum.NOVU_CLOUD,
      steps: [
        {
          name: 'In-App Notification',
          template: inAppTemplate,
          active: true,
          stepId: 'in-app-step',
          filters: [],
          _templateId: inAppTemplate._id,
          _id: inAppTemplate._id,
        },
      ],
      triggers: [
        {
          type: 'event',
          identifier: 'hello-world',
          variables: [
            { name: 'subject', type: 'string' },
            { name: 'body', type: 'string' },
          ],
        },
      ],
    });

    await this.preferencesRepository.create({
      _templateId: workflow._id,
      _environmentId: environmentId,
      _organizationId: organizationId,
      _userId: userId,
      type: PreferencesTypeEnum.USER_WORKFLOW,
      preferences: {
        all: {
          enabled: true,
          readOnly: false,
        },
        channels: {
          [ChannelTypeEnum.IN_APP]: {
            enabled: true,
            readOnly: false,
          },
          [ChannelTypeEnum.EMAIL]: {
            enabled: true,
            readOnly: false,
          },
          [ChannelTypeEnum.SMS]: {
            enabled: true,
            readOnly: false,
          },
          [ChannelTypeEnum.PUSH]: {
            enabled: true,
            readOnly: false,
          },
          [ChannelTypeEnum.CHAT]: {
            enabled: true,
            readOnly: false,
          },
        },
      },
    });

    await this.preferencesRepository.create({
      _templateId: workflow._id,
      _environmentId: environmentId,
      _organizationId: organizationId,
      _userId: userId,
      type: PreferencesTypeEnum.WORKFLOW_RESOURCE,
      preferences: {
        all: {
          enabled: true,
          readOnly: false,
        },
        channels: {
          [ChannelTypeEnum.IN_APP]: {
            enabled: true,
            readOnly: false,
          },
          [ChannelTypeEnum.EMAIL]: {
            enabled: true,
            readOnly: false,
          },
          [ChannelTypeEnum.SMS]: {
            enabled: true,
            readOnly: false,
          },
          [ChannelTypeEnum.PUSH]: {
            enabled: true,
            readOnly: false,
          },
          [ChannelTypeEnum.CHAT]: {
            enabled: true,
            readOnly: false,
          },
        },
      },
    });

    await this.upsertControlValuesUseCase.execute(
      UpsertControlValuesCommand.create({
        organizationId,
        environmentId,
        stepId: workflow.steps[0]._templateId,
        level: ControlValuesLevelEnum.STEP_CONTROLS,
        workflowId: workflow._id,
        newControlValues: {
          body: '{{payload.body}}',
          avatar: 'https://dashboard.novu.co/images/avatar.svg',
          subject: '{{payload.subject}}',
          primaryAction: {
            label: '{{payload.primaryActionText}}',
            redirect: {
              url: '{{payload.primaryActionUrl}}',
              target: '_blank',
            },
          },
          secondaryAction: {
            label: '{{payload.secondaryActionText}}',
            redirect: {
              url: '{{payload.secondaryActionUrl}}',
              target: '_blank',
            },
          },
          redirect: null,
          disableOutputSanitization: false,
          data: null,
        },
      })
    );

    return workflow;
  }

  private convertEnvironmentEntityToDto(environment: EnvironmentEntity) {
    const dto = new EnvironmentResponseDto();

    dto._id = environment._id;
    dto.name = environment.name;
    dto._organizationId = environment._organizationId;
    dto.identifier = environment.identifier;
    dto._parentId = environment._parentId;

    if (environment.apiKeys && environment.apiKeys.length > 0) {
      dto.apiKeys = environment.apiKeys.map((apiKey) => ({
        key: apiKey.key,
        hash: apiKey.hash,
        _userId: apiKey._userId,
      }));
    }

    return dto;
  }
}

function timestampHexToDate(timestampHex) {
  if (!timestampHex || typeof timestampHex !== 'string' || timestampHex.length < 8) {
    throw new Error('Invalid timestamp hex format');
  }

  const buffer = Buffer.from(timestampHex, 'hex');
  if (buffer.length < 4) {
    throw new Error('Buffer too small to read 32-bit integer');
  }

  const timestamp = buffer.readUInt32BE(0);

  return new Date(timestamp * 1000);
}
