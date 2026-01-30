import { DynamicModule, Logger, Module, OnApplicationShutdown, Provider } from '@nestjs/common';
import {
  InMemoryProviderService,
  WorkflowInMemoryProviderService,
} from '@novu/application-generic';
import { CommunityOrganizationRepository } from '@novu/dal';

import { SharedModule } from '../shared/shared.module';
import { TranslationWorker } from './services';

const LOG_CONTEXT = 'TranslationModule';

/**
 * Check if translation worker should be loaded
 *
 * The worker is loaded when:
 * - ACTIVE_WORKERS is not set (load all workers by default)
 * - ACTIVE_WORKERS includes 'translation-queue'
 */
const shouldLoadTranslationWorker = (): boolean => {
  const activeWorkers = process.env.ACTIVE_WORKERS;

  if (!activeWorkers) {
    return true; // Load all workers by default
  }

  return activeWorkers.split(',').some((w) => w.trim() === 'translation-queue');
};

/**
 * Get enterprise translation imports if available
 */
const getEnterpriseImports = (): any[] => {
  const modules: any[] = [];

  try {
    const isEnterprise = process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true';

    if (isEnterprise) {
      // Import @novu/translation module for enterprise features
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const translationModule = require('@novu/translation');
      if (translationModule?.TranslationModule) {
        Logger.log('Importing translation module', LOG_CONTEXT);
        modules.push(translationModule.TranslationModule.forRoot());
      }
    } else {
      // For community edition, still import the translation module
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const translationModule = require('@novu/translation');
      if (translationModule?.TranslationModule) {
        Logger.log('Importing community translation module', LOG_CONTEXT);
        modules.push(translationModule.TranslationModule.forRoot());
      }
    }
  } catch (e) {
    Logger.warn(`Translation module not available: ${e instanceof Error ? e.message : String(e)}`, LOG_CONTEXT);
  }

  return modules;
};

const REPOSITORIES = [CommunityOrganizationRepository];

const memoryQueueService: Provider = {
  provide: WorkflowInMemoryProviderService,
  useFactory: async () => {
    const memoryService = new WorkflowInMemoryProviderService();
    await memoryService.initialize();
    return memoryService;
  },
};

const inMemoryProviderService: Provider = {
  provide: InMemoryProviderService,
  useFactory: (workflowInMemoryProviderService: WorkflowInMemoryProviderService) => {
    return workflowInMemoryProviderService.inMemoryProviderService;
  },
  inject: [WorkflowInMemoryProviderService],
};

/**
 * TranslationModule
 *
 * NestJS module for the translation background worker.
 * This module is responsible for processing translation jobs from the queue.
 *
 * The module:
 * - Imports the TranslationModule from @novu/translation for usecase access
 * - Provides the TranslationWorker for job processing
 * - Configures memory provider services for Bull queue
 *
 * Configuration:
 * - Set ACTIVE_WORKERS to include 'translation-queue' to enable this worker
 * - Or leave ACTIVE_WORKERS unset to enable all workers
 */
@Module({})
export class TranslationWorkerModule implements OnApplicationShutdown {
  private workflowInMemoryProviderService: WorkflowInMemoryProviderService;

  constructor(workflowInMemoryProviderService: WorkflowInMemoryProviderService) {
    this.workflowInMemoryProviderService = workflowInMemoryProviderService;
  }

  static forRoot(): DynamicModule {
    const shouldLoad = shouldLoadTranslationWorker();

    if (!shouldLoad) {
      Logger.log('Translation worker not in ACTIVE_WORKERS list, skipping', LOG_CONTEXT);
      return {
        module: TranslationWorkerModule,
        providers: [memoryQueueService, inMemoryProviderService],
      };
    }

    Logger.log('Initializing Translation Worker Module', LOG_CONTEXT);

    return {
      module: TranslationWorkerModule,
      imports: [SharedModule, ...getEnterpriseImports()],
      providers: [
        memoryQueueService,
        inMemoryProviderService,
        ...REPOSITORIES,
        TranslationWorker,
      ],
      exports: [TranslationWorker],
    };
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.workflowInMemoryProviderService) {
      await this.workflowInMemoryProviderService.shutdown();
    }
  }
}
