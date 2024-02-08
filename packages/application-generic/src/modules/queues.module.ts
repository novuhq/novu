import {
  DynamicModule,
  Logger,
  Module,
  OnApplicationShutdown,
  Provider,
} from '@nestjs/common';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { ForwardReference } from '@nestjs/common/interfaces/modules/forward-reference.interface';

import {
  ActiveJobsMetricQueueServiceHealthIndicator,
  InboundParseQueueServiceHealthIndicator,
  StandardQueueServiceHealthIndicator,
  SubscriberProcessQueueHealthIndicator,
  WebSocketsQueueServiceHealthIndicator,
  WorkflowQueueServiceHealthIndicator,
} from '../health';
import { ReadinessService, WorkflowInMemoryProviderService } from '../services';
import {
  ActiveJobsMetricQueueService,
  ExecutionLogQueueService,
  InboundParseQueueService,
  StandardQueueService,
  SubscriberProcessQueueService,
  WebSocketsQueueService,
  WorkflowQueueService,
} from '../services/queues';
import { ActiveJobsMetricWorkerService } from '../services/workers';
import { JobTopicNameEnum } from '@novu/shared';
import { CronModule } from './cron.module';

const memoryQueueService = {
  provide: WorkflowInMemoryProviderService,
  useFactory: async () => {
    const memoryService = new WorkflowInMemoryProviderService();

    await memoryService.initialize();

    return memoryService;
  },
};

const INTERNAL_MODULE_PROVIDERS = [memoryQueueService];
const BASE_PROVIDERS: Provider[] = [ReadinessService];

const enterpriseImports = (): Array<
  Type | DynamicModule | Promise<DynamicModule> | ForwardReference
> => {
  const modules: Array<
    Type | DynamicModule | Promise<DynamicModule> | ForwardReference
  > = [];
  try {
    if (
      process.env.NOVU_ENTERPRISE === 'true' ||
      process.env.CI_EE_TEST === 'true'
    ) {
      if (require('@novu/ee-billing')?.BillingModule) {
        modules.push(require('@novu/ee-billing')?.BillingModule);
      }
    }
  } catch (e) {
    Logger.error(
      e,
      `Unexpected error while importing enterprise modules`,
      'EnterpriseImport'
    );
  }

  return modules;
};

@Module({
  providers: [],
  exports: [],
})
export class QueuesModule implements OnApplicationShutdown {
  static forRoot(entities: JobTopicNameEnum[] = []): DynamicModule {
    if (!entities.length) {
      entities = Object.values(JobTopicNameEnum);
    }

    const healthIndicators = [];
    const tokenList = [];
    const DYNAMIC_PROVIDERS = [...BASE_PROVIDERS];

    for (const entity of entities) {
      switch (entity) {
        case JobTopicNameEnum.INBOUND_PARSE_MAIL:
          healthIndicators.push(InboundParseQueueServiceHealthIndicator);
          tokenList.push(InboundParseQueueService);
          DYNAMIC_PROVIDERS.push(
            InboundParseQueueService,
            InboundParseQueueServiceHealthIndicator
          );
          break;
        case JobTopicNameEnum.WORKFLOW:
          healthIndicators.push(WorkflowQueueServiceHealthIndicator);
          tokenList.push(WorkflowQueueService);
          DYNAMIC_PROVIDERS.push(
            WorkflowQueueService,
            WorkflowQueueServiceHealthIndicator
          );
          break;
        case JobTopicNameEnum.WEB_SOCKETS:
          healthIndicators.push(WebSocketsQueueServiceHealthIndicator);
          tokenList.push(WebSocketsQueueService);
          DYNAMIC_PROVIDERS.push(
            WebSocketsQueueService,
            WebSocketsQueueServiceHealthIndicator
          );
          break;
        case JobTopicNameEnum.STANDARD:
          const eeProviders: Provider[] = [];
          try {
            if (
              process.env.NOVU_ENTERPRISE === 'true' ||
              process.env.CI_EE_TEST === 'true'
            ) {
              eeProviders.push(
                require('@novu/ee-billing').BillingUsageCronService
              );
            }
          } catch (e) {
            Logger.log('BillingUsageCronService not available');
          }
          tokenList.push(StandardQueueService);
          DYNAMIC_PROVIDERS.push(
            StandardQueueService,
            StandardQueueServiceHealthIndicator,
            ...eeProviders
          );
          break;
        case JobTopicNameEnum.PROCESS_SUBSCRIBER:
          healthIndicators.push(SubscriberProcessQueueHealthIndicator);
          tokenList.push(SubscriberProcessQueueService);
          DYNAMIC_PROVIDERS.push(
            SubscriberProcessQueueService,
            SubscriberProcessQueueHealthIndicator
          );
          break;
        case JobTopicNameEnum.EXECUTION_LOG:
          tokenList.push(ExecutionLogQueueService);
          DYNAMIC_PROVIDERS.push(ExecutionLogQueueService);
          break;
        case JobTopicNameEnum.ACTIVE_JOBS_METRIC:
          healthIndicators.push(ActiveJobsMetricQueueServiceHealthIndicator);
          tokenList.push(ActiveJobsMetricQueueService);
          DYNAMIC_PROVIDERS.push(
            ActiveJobsMetricQueueService,
            ActiveJobsMetricQueueServiceHealthIndicator,
            ActiveJobsMetricWorkerService
          );
          break;
      }
    }

    DYNAMIC_PROVIDERS.push({
      provide: 'BULLMQ_LIST',
      useFactory: (...args: any[]) => {
        return args;
      },
      inject: tokenList,
    });

    DYNAMIC_PROVIDERS.push({
      provide: 'QUEUE_HEALTH_INDICATORS',
      useFactory: (...args: any[]) => {
        return args;
      },
      inject: healthIndicators,
    });

    return {
      imports: [CronModule, ...enterpriseImports()],
      module: QueuesModule,
      providers: [...DYNAMIC_PROVIDERS, ...INTERNAL_MODULE_PROVIDERS],
      exports: [...DYNAMIC_PROVIDERS],
    };
  }

  constructor(
    private workflowInMemoryProviderService: WorkflowInMemoryProviderService
  ) {}

  async onApplicationShutdown() {
    await this.workflowInMemoryProviderService.shutdown();
  }
}
