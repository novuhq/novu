import { DynamicModule, Module, OnApplicationShutdown, Provider } from '@nestjs/common';
import { CommunityOrganizationRepository, MessageRepository } from '@novu/dal';
import { JobTopicNameEnum } from '@novu/shared';
import { hasMetricsBackend, isBullMqEnabled } from '../config';
import { featureFlagsService } from '../custom-providers';
import {
  ActiveJobsMetricQueueServiceHealthIndicator,
  IHealthIndicator,
  InboundParseQueueServiceHealthIndicator,
  StandardQueueServiceHealthIndicator,
  SubscriberProcessQueueHealthIndicator,
  WebSocketsQueueServiceHealthIndicator,
  WorkflowQueueServiceHealthIndicator,
} from '../health';
import {
  EventBridgeSchedulerService,
  ReadinessService,
  SocketWorkerService,
  SqsService,
  WorkflowInMemoryProviderService,
} from '../services';
import {
  ActiveJobsMetricQueueService,
  InboundParseQueueService,
  QueueBaseService,
  StandardQueueService,
  SubscriberProcessQueueService,
  WebSocketsQueueService,
  WorkflowQueueService,
} from '../services/queues';
import { ActiveJobsMetricWorkerService } from '../services/workers';

const memoryQueueService = {
  provide: WorkflowInMemoryProviderService,
  useFactory: async () => {
    const memoryService = new WorkflowInMemoryProviderService();

    await memoryService.initialize();

    return memoryService;
  },
};

const INTERNAL_MODULE_PROVIDERS = [memoryQueueService, featureFlagsService];
const BASE_PROVIDERS: Provider[] = [
  ReadinessService,
  CommunityOrganizationRepository,
  SqsService,
  EventBridgeSchedulerService,
];

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
          DYNAMIC_PROVIDERS.push(InboundParseQueueService, InboundParseQueueServiceHealthIndicator);
          break;
        case JobTopicNameEnum.WORKFLOW:
          healthIndicators.push(WorkflowQueueServiceHealthIndicator);
          tokenList.push(WorkflowQueueService);
          DYNAMIC_PROVIDERS.push(WorkflowQueueService, WorkflowQueueServiceHealthIndicator);
          break;
        case JobTopicNameEnum.WEB_SOCKETS:
          healthIndicators.push(WebSocketsQueueServiceHealthIndicator);
          tokenList.push(WebSocketsQueueService);
          DYNAMIC_PROVIDERS.push(
            MessageRepository,
            SocketWorkerService,
            WebSocketsQueueService,
            WebSocketsQueueServiceHealthIndicator
          );
          break;
        case JobTopicNameEnum.STANDARD:
          healthIndicators.push(StandardQueueServiceHealthIndicator);
          tokenList.push(StandardQueueService);
          DYNAMIC_PROVIDERS.push(StandardQueueService, StandardQueueServiceHealthIndicator);
          break;
        case JobTopicNameEnum.PROCESS_SUBSCRIBER:
          healthIndicators.push(SubscriberProcessQueueHealthIndicator);
          tokenList.push(SubscriberProcessQueueService);
          DYNAMIC_PROVIDERS.push(SubscriberProcessQueueService, SubscriberProcessQueueHealthIndicator);
          break;
        case JobTopicNameEnum.ACTIVE_JOBS_METRIC:
          // The gauges it records are BullMQ counters, so the topic follows BullMQ.
          if (!isBullMqEnabled()) {
            break;
          }

          /*
           * Without a metrics backend `ActiveJobsMetricService` never creates a
           * worker for this queue, so waiting on its health would gate startup
           * on a queue nothing consumes.
           */
          if (hasMetricsBackend()) {
            healthIndicators.push(ActiveJobsMetricQueueServiceHealthIndicator);
          }
          tokenList.push(ActiveJobsMetricQueueService);
          DYNAMIC_PROVIDERS.push(
            ActiveJobsMetricQueueService,
            ActiveJobsMetricQueueServiceHealthIndicator,
            ActiveJobsMetricWorkerService
          );
          break;
        default: {
          const exhaustive: never = entity;
          throw new Error(`Unhandled job topic in QueuesModule: ${exhaustive}`);
        }
      }
    }

    DYNAMIC_PROVIDERS.push({
      provide: 'BULLMQ_LIST',
      useFactory: (...queueServices: QueueBaseService[]) => {
        return queueServices;
      },
      inject: tokenList,
    });

    DYNAMIC_PROVIDERS.push({
      provide: 'QUEUE_HEALTH_INDICATORS',
      useFactory: (...indicators: IHealthIndicator[]) => {
        return indicators;
      },
      /*
       * These indicators only assert that the BullMQ client is up. Handing them
       * to readiness once BullMQ is retired would make
       * `ReadinessService.enableWorkers` block startup on a backend the
       * deployment no longer uses.
       */
      inject: isBullMqEnabled() ? healthIndicators : [],
    });

    return {
      module: QueuesModule,
      providers: [...DYNAMIC_PROVIDERS, ...INTERNAL_MODULE_PROVIDERS],
      exports: [...DYNAMIC_PROVIDERS],
    };
  }

  constructor(private workflowInMemoryProviderService: WorkflowInMemoryProviderService) {}

  async onApplicationShutdown() {
    await this.workflowInMemoryProviderService.shutdown();
  }
}
