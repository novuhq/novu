import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  areNovuManagedClaudeCredentialsSet,
  CacheService,
  encryptApiKey,
  FeatureFlagsService,
  generateTimestampHex,
  PinoLogger,
  shortId,
  UpsertControlValuesCommand,
  UpsertControlValuesUseCase,
} from '@novu/application-generic';
import {
  CommunityOrganizationRepository,
  CommunityUserRepository,
  EnvironmentEntity,
  EnvironmentRepository,
  MessageTemplateRepository,
  NotificationTemplateRepository,
  OrganizationEntity,
  PreferencesRepository,
  UserEntity,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  ControlValuesLevelEnum,
  EnvironmentEnum,
  EnvironmentTypeEnum,
  FeatureFlagsKeysEnum,
  type KeylessCreationSource,
  PreferencesTypeEnum,
  ResourceOriginEnum,
  ResourceTypeEnum,
  SignupSourceEnum,
  StepTypeEnum,
} from '@novu/shared';
import { nanoid } from 'nanoid';
import { GenerateUniqueApiKey } from '../../../environments-v1/usecases/generate-unique-api-key/generate-unique-api-key.usecase';
import { CreateNovuIntegrationsCommand } from '../../../integrations/usecases/create-novu-integrations/create-novu-integrations.command';
import { CreateNovuIntegrations } from '../../../integrations/usecases/create-novu-integrations/create-novu-integrations.usecase';
import { writeKeylessCreationSource } from '../../../keyless/keyless-agent-cache';
import { hashApiKey, KEYLESS_AGENT_ENVIRONMENT_NAME_PREFIX } from '../../../keyless/keyless-agent-environment';
import { KEYLESS_CREATION_SOURCE_TTL_SECONDS } from '../../../keyless/keyless-signup-analytics';
import { KEYLESS_ENVIRONMENT_PREFIX, KEYLESS_WORKFLOW_IDENTIFIER } from '../../utils';
import { CreateKeylessEnvironmentCommand, KeylessEnvironmentPurposeEnum } from './create-keyless-environment.command';

export interface CreateKeylessEnvironmentResult {
  environment: EnvironmentEntity;
  secretKey: string;
}

interface KeylessEnvironmentProfile {
  identifier: string;
  name: string;
  includeManagedClaude: boolean;
  /** Inbox demo payload carries action labels/URLs; without them the rendered in-app step output is invalid. */
  includeDemoActions: boolean;
  creationSource: KeylessCreationSource;
}

@Injectable()
export class CreateKeylessEnvironment {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private communityOrganizationRepository: CommunityOrganizationRepository,
    private communityUserRepository: CommunityUserRepository,
    private generateUniqueApiKey: GenerateUniqueApiKey,
    private createNovuIntegrationsUsecase: CreateNovuIntegrations,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private messageTemplateRepository: MessageTemplateRepository,
    private preferencesRepository: PreferencesRepository,
    private upsertControlValuesUseCase: UpsertControlValuesUseCase,
    private featureFlagsService: FeatureFlagsService,
    private cacheService: CacheService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: CreateKeylessEnvironmentCommand): Promise<CreateKeylessEnvironmentResult> {
    if (command.purpose === KeylessEnvironmentPurposeEnum.INBOX_DEMO && process.env.NOVU_ENTERPRISE !== 'true') {
      throw new BadRequestException('Keyless is not supported in community edition');
    }

    const organization = await this.findKeylessOrganization();

    if (command.purpose === KeylessEnvironmentPurposeEnum.INBOX_DEMO) {
      await this.assertInboxDemoAllowed(organization);
    }

    const user = await this.findKeylessUser();

    const profile = this.buildProfile(command.purpose);
    const secretKey = `sk_${await this.generateUniqueApiKey.execute()}`;
    const environment = await this.environmentRepository.create({
      _organizationId: organization._id,
      name: profile.name,
      identifier: profile.identifier,
      type: EnvironmentTypeEnum.DEV,
      apiKeys: [
        {
          key: encryptApiKey(secretKey),
          _userId: user._id,
          hash: hashApiKey(secretKey),
        },
      ],
    });

    await this.createNovuIntegrationsUsecase.execute(
      CreateNovuIntegrationsCommand.create({
        environmentId: environment._id,
        organizationId: environment._organizationId,
        userId: user._id,
        name: EnvironmentEnum.DEVELOPMENT,
        channels: [ChannelTypeEnum.IN_APP, ChannelTypeEnum.EMAIL],
        includeManagedClaude: profile.includeManagedClaude,
        environmentType: EnvironmentTypeEnum.DEV,
      })
    );

    await this.createHelloWorldWorkflow(
      environment._id,
      environment._organizationId,
      user._id,
      profile.includeDemoActions
    );

    await writeKeylessCreationSource(
      this.cacheService,
      environment._id,
      profile.creationSource,
      KEYLESS_CREATION_SOURCE_TTL_SECONDS
    );

    this.logger.info(
      { environmentId: environment._id, purpose: command.purpose },
      'Keyless environment created successfully'
    );

    return { environment, secretKey };
  }

  private buildProfile(purpose: KeylessEnvironmentPurposeEnum): KeylessEnvironmentProfile {
    const createdAtIso = new Date().toISOString();

    switch (purpose) {
      case KeylessEnvironmentPurposeEnum.INBOX_DEMO:
        return {
          identifier: `${KEYLESS_ENVIRONMENT_PREFIX}${generateTimestampHex()}_${shortId(4)}`,
          name: `Keyless ${createdAtIso}`,
          includeManagedClaude: true,
          includeDemoActions: true,
          creationSource: SignupSourceEnum.INBOX,
        };
      case KeylessEnvironmentPurposeEnum.AGENT:
        return {
          identifier: nanoid(12),
          name: `${KEYLESS_AGENT_ENVIRONMENT_NAME_PREFIX}${createdAtIso}`,
          includeManagedClaude: false,
          includeDemoActions: false,
          creationSource: SignupSourceEnum.AGENT,
        };
      default: {
        const exhaustiveCheck: never = purpose;
        throw new InternalServerErrorException(`Unsupported keyless environment purpose: ${exhaustiveCheck}`);
      }
    }
  }

  private async findKeylessOrganization(): Promise<OrganizationEntity> {
    const keylessOrganizationId = process.env.KEYLESS_ORGANIZATION_ID;
    if (!keylessOrganizationId) {
      throw new InternalServerErrorException('Keyless Organization ID is not configured');
    }

    const organization = await this.communityOrganizationRepository.findById(keylessOrganizationId);

    if (!organization) {
      this.logger.error('Keyless Organization not found');
      throw new InternalServerErrorException('Keyless Organization not found');
    }

    return organization;
  }

  private async findKeylessUser(): Promise<UserEntity> {
    const keylessUserEmail = process.env.KEYLESS_USER_EMAIL;
    if (!keylessUserEmail) {
      throw new InternalServerErrorException('Keyless User email is not configured');
    }

    const user = await this.communityUserRepository.findByEmail(keylessUserEmail);

    if (!user) {
      throw new InternalServerErrorException('Keyless User not found');
    }

    return user;
  }

  private async assertInboxDemoAllowed(organization: OrganizationEntity): Promise<void> {
    const isKeylessEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_KEYLESS_ENVIRONMENT_CREATION_ENABLED,
      defaultValue: false,
      organization,
    });

    if (!isKeylessEnabled) {
      throw new BadRequestException('Keyless environment creation is currently disabled.');
    }

    if (!areNovuManagedClaudeCredentialsSet()) {
      throw new BadRequestException(
        'Keyless Connect requires NOVU_MANAGED_CLAUDE_API_KEY to be configured on the API server.'
      );
    }

    const isDemoManagedClaudeEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_DEMO_MANAGED_CLAUDE_ENABLED,
      defaultValue: false,
      organization,
    });

    if (!isDemoManagedClaudeEnabled) {
      throw new BadRequestException(
        'Keyless Connect requires the IS_DEMO_MANAGED_CLAUDE_ENABLED feature flag to be enabled on the API server.'
      );
    }
  }

  private async createHelloWorldWorkflow(
    environmentId: string,
    organizationId: string,
    userId: string,
    includeDemoActions: boolean
  ) {
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
          identifier: KEYLESS_WORKFLOW_IDENTIFIER,
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
          ...(includeDemoActions && {
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
          }),
          redirect: null,
          disableOutputSanitization: false,
          data: null,
        },
      })
    );

    return workflow;
  }
}
