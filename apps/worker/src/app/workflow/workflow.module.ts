import { DynamicModule, Logger, Module, OnApplicationShutdown, Provider, Type } from '@nestjs/common';
import { ForwardReference } from '@nestjs/common/interfaces/modules/forward-reference.interface';
import {
  BulkCreateExecutionDetails,
  CalculateLimitNovuIntegration,
  CompileEmailTemplate,
  CompileInAppTemplate,
  CompileTemplate,
  ConditionsFilter,
  CreateExecutionDetails,
  ExecuteStepResolverRequest,
  GetDecryptedIntegrations,
  GetLayoutUseCaseV0,
  GetNovuLayout,
  GetNovuProviderCredentials,
  GetPreferences,
  GetSubscriberSchedule,
  GetSubscriberTemplatePreference,
  GetTopicSubscribersUseCase,
  InMemoryProviderService,
  NormalizeVariables,
  ProcessTenant,
  RedisThrottleService,
  SelectIntegration,
  SelectVariant,
  SendWebhookMessage,
  TierRestrictionsValidateUsecase,
  TriggerBroadcast,
  TriggerEvent,
  TriggerMulticast,
  VerifyPayload,
  WorkflowInMemoryProviderService,
} from '@novu/application-generic';
import {
  ChannelConnectionRepository,
  ChannelEndpointRepository,
  CommunityOrganizationRepository,
  CommunityUserRepository,
  ContextRepository,
  JobRepository,
  PreferencesRepository,
} from '@novu/dal';
import { JobTopicNameEnum } from '@novu/shared';
import { ACTIVE_WORKERS, workersToProcess } from '../../config/worker-init.config';
import { SharedModule } from '../shared/shared.module';
import {
  Digest,
  ExecuteBridgeJob,
  GetDigestEventsBackoff,
  GetDigestEventsRegular,
  HandleLastFailedJob,
  ProcessUnsnoozeJob,
  QueueNextJob,
  RunJob,
  SendMessage,
  SendMessageChat,
  SendMessageDelay,
  SendMessageEmail,
  SendMessageInApp,
  SendMessagePush,
  SendMessageSms,
  SetJobAsCompleted,
  SetJobAsFailed,
  Throttle,
  UpdateJobStatus,
  WebhookFilterBackoffStrategy,
} from './usecases';
import { AddJob, MergeOrCreateDigest } from './usecases/add-job';
import { InboundEmailParse } from './usecases/inbound-email-parse/inbound-email-parse.usecase';
import { NoopSendWebhookMessage } from './usecases/noop-send-webhook-message.usecase';
import { ResolveChannelEndpoints } from './usecases/send-message/channel-endpoint-resolution/resolve-channel-endpoints.usecase';
import { ExecuteCodeFirstCustomStep } from './usecases/send-message/execute-code-first-custom-step.usecase';
import { ExecuteHttpRequestStep } from './usecases/send-message/execute-http-request-step.usecase';
import { StoreSubscriberJobs } from './usecases/store-subscriber-jobs';
import { SubscriberJobBound } from './usecases/subscriber-job-bound/subscriber-job-bound.usecase';

const enterpriseImports = (): Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> => {
  const modules: Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> = [];
  try {
    if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
      Logger.log('Importing enterprise modules', 'EnterpriseImport');
      if (require('@novu/ee-translation')?.EnterpriseTranslationModuleWithoutControllers) {
        Logger.log('Importing enterprise translations module', 'EnterpriseImport');
        modules.push(require('@novu/ee-translation')?.EnterpriseTranslationModuleWithoutControllers);
      }

      if (require('@novu/ee-billing')?.BillingModule) {
        Logger.log('Importing enterprise billing module', 'EnterpriseImport');
        const activeWorkers = workersToProcess.length ? workersToProcess : Object.values(JobTopicNameEnum);
        modules.push(require('@novu/ee-billing')?.BillingModule.forRoot(activeWorkers));
      }
    }
  } catch (e) {
    Logger.error(e, `Unexpected error while importing enterprise modules`, 'EnterpriseImport');
  }

  return modules;
};

const REPOSITORIES = [
  JobRepository,
  CommunityOrganizationRepository,
  PreferencesRepository,
  CommunityUserRepository,
  ChannelEndpointRepository,
  ChannelConnectionRepository,
  ContextRepository,
];

const webhookProvider: Provider = {
  provide: SendWebhookMessage,
  useClass: (() => {
    const isEnterprise = process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true';

    if (isEnterprise) {
      Logger.log('Using enterprise SendWebhookMessage provider', 'EnterpriseProvider');
      return SendWebhookMessage;
    } else {
      Logger.log('Using noop SendWebhookMessage provider', 'EnterpriseProvider');
      return NoopSendWebhookMessage;
    }
  })(),
};

const svixProvider: Provider = {
  provide: 'SVIX_CLIENT',
  useFactory: () => {
    const isEnterprise = process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true';

    if (isEnterprise) {
      Logger.log('Using enterprise SvixProviderService provider', 'EnterpriseProvider');
      const apiKey = process.env.SVIX_API_KEY;
      if (!apiKey) {
        return null;
      }
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Svix } = require('svix');
      return new Svix(apiKey);
    } else {
      Logger.log('Using noop SvixProviderService provider', 'EnterpriseProvider');
      return null;
    }
  },
};

const USE_CASES = [
  TierRestrictionsValidateUsecase,
  MergeOrCreateDigest,
  AddJob,
  CalculateLimitNovuIntegration,
  CompileEmailTemplate,
  CompileTemplate,
  CreateExecutionDetails,
  ConditionsFilter,
  NormalizeVariables,
  BulkCreateExecutionDetails,
  Digest,
  GetDecryptedIntegrations,
  GetDigestEventsBackoff,
  GetDigestEventsRegular,
  GetLayoutUseCaseV0,
  GetNovuLayout,
  GetNovuProviderCredentials,
  SelectIntegration,
  SelectVariant,
  GetSubscriberTemplatePreference,
  HandleLastFailedJob,
  ProcessTenant,
  QueueNextJob,
  RunJob,
  SendMessage,
  SendMessageChat,
  SendMessageDelay,
  SendMessageEmail,
  SendMessageInApp,
  SendMessagePush,
  SendMessageSms,
  Throttle,
  ExecuteCodeFirstCustomStep,
  ExecuteHttpRequestStep,
  StoreSubscriberJobs,
  SetJobAsCompleted,
  SetJobAsFailed,
  TriggerEvent,
  VerifyPayload,
  UpdateJobStatus,
  ProcessUnsnoozeJob,
  WebhookFilterBackoffStrategy,
  GetTopicSubscribersUseCase,
  SubscriberJobBound,
  TriggerBroadcast,
  TriggerMulticast,
  CompileInAppTemplate,
  InboundEmailParse,
  ExecuteBridgeJob,
  ExecuteStepResolverRequest,
  GetPreferences,
  GetSubscriberSchedule,
  ResolveChannelEndpoints,
];

const PROVIDERS: Provider[] = [RedisThrottleService];
const activeWorkersToken: any = {
  provide: 'ACTIVE_WORKERS',
  useFactory: (...args: any[]) => {
    return args;
  },
  inject: ACTIVE_WORKERS,
};

const memoryQueueService = {
  provide: WorkflowInMemoryProviderService,
  useFactory: async () => {
    const memoryService = new WorkflowInMemoryProviderService();

    await memoryService.initialize();

    return memoryService;
  },
};

const inMemoryProviderService = {
  provide: InMemoryProviderService,
  useFactory: (workflowInMemoryProviderService: WorkflowInMemoryProviderService) => {
    return workflowInMemoryProviderService.inMemoryProviderService;
  },
  inject: [WorkflowInMemoryProviderService],
};

@Module({
  imports: [SharedModule, ...enterpriseImports()],
  controllers: [],
  providers: [
    memoryQueueService,
    inMemoryProviderService,
    ...ACTIVE_WORKERS,
    ...PROVIDERS,
    ...USE_CASES,
    ...REPOSITORIES,
    activeWorkersToken,
    webhookProvider,
    svixProvider,
  ],
  exports: [...PROVIDERS, ...USE_CASES, ...REPOSITORIES, activeWorkersToken],
})
export class WorkflowModule implements OnApplicationShutdown {
  constructor(private workflowInMemoryProviderService: WorkflowInMemoryProviderService) {}

  async onApplicationShutdown() {
    await this.workflowInMemoryProviderService.shutdown();
  }
}
