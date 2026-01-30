import { Module, DynamicModule, Global, Logger, Provider } from '@nestjs/common';
import {
  TranslationQueueService,
  WorkflowInMemoryProviderService,
} from '@novu/application-generic';
import {
  LocalizationGroupRepository,
  LocalizationRepository,
} from '@novu/dal';

import { TranslationSettingsRepository } from './dal';
import {
  VariableTokenizerService,
  TranslationValidatorService,
  OpenAITranslationService,
} from './services';
import {
  ManageTranslations,
  DeleteTranslationGroup,
  PublishTranslationGroup,
  DuplicateLocales,
  AutoTranslate,
  EnqueueTranslation,
} from './usecases';
import {
  TranslationSettingsController,
  TranslationController,
} from './controllers';

const LOG_CONTEXT = 'TranslationModule';

/**
 * Create the optional TranslationQueueService provider
 *
 * The queue service requires WorkflowInMemoryProviderService which may not
 * be available in all environments (e.g., unit tests). We make it optional
 * and handle its absence gracefully.
 */
const createQueueServiceProvider = (): Provider[] => {
  try {
    return [
      {
        provide: TranslationQueueService,
        useFactory: (workflowInMemoryProviderService: WorkflowInMemoryProviderService | null) => {
          if (!workflowInMemoryProviderService) {
            Logger.warn('WorkflowInMemoryProviderService not available, TranslationQueueService disabled', LOG_CONTEXT);
            return null;
          }
          return new TranslationQueueService(workflowInMemoryProviderService);
        },
        inject: [{ token: WorkflowInMemoryProviderService, optional: true }],
      },
    ];
  } catch (error) {
    Logger.warn(`TranslationQueueService initialization failed: ${error}`, LOG_CONTEXT);
    return [];
  }
};

/**
 * TranslationModule provides translation services, repositories, and usecases
 *
 * Usage:
 * ```typescript
 * // In your app module
 * @Module({
 *   imports: [TranslationModule.forRoot()],
 * })
 * export class AppModule {}
 * ```
 *
 * The module exports:
 *
 * Repositories:
 * - TranslationSettingsRepository: For managing translation settings
 *
 * Services:
 * - VariableTokenizerService: For tokenizing/detokenizing template variables
 * - TranslationValidatorService: For validating translated content
 * - OpenAITranslationService: For translating content via OpenAI
 *
 * Usecases:
 * - ManageTranslations: Enable/disable translations on resources
 * - DeleteTranslationGroup: Cleanup when resource is deleted
 * - PublishTranslationGroup: Sync translations between environments
 * - DuplicateLocales: Copy translations when duplicating resources
 * - AutoTranslate: Trigger automatic translation using OpenAI
 * - EnqueueTranslation: Queue translation jobs for async processing
 *
 * Controllers (available when using forRoot with controllers):
 * - TranslationSettingsController: API for managing translation settings
 * - TranslationController: API for triggering translations
 *
 * Note: This module should be imported in apps/api/src/app.module.ts
 * during Phase 5 of implementation.
 */
@Global()
@Module({})
export class TranslationModule {
  /**
   * Register the translation module as a root module
   *
   * This method should be called once in the root application module.
   * It provides all translation services, repositories, and usecases as singletons.
   *
   * @param options - Module options
   * @param options.includeControllers - Whether to include controllers (for API app)
   * @param options.includeQueueService - Whether to include the queue service (for async translation)
   * @returns Dynamic module configuration
   */
  static forRoot(options?: { includeControllers?: boolean; includeQueueService?: boolean }): DynamicModule {
    const controllers = options?.includeControllers
      ? [TranslationSettingsController, TranslationController]
      : [];

    const queueProviders = options?.includeQueueService !== false
      ? createQueueServiceProvider()
      : [];

    return {
      module: TranslationModule,
      controllers,
      providers: [
        // Repositories
        {
          provide: TranslationSettingsRepository,
          useFactory: () => new TranslationSettingsRepository(),
        },
        {
          provide: LocalizationGroupRepository,
          useFactory: () => new LocalizationGroupRepository(),
        },
        {
          provide: LocalizationRepository,
          useFactory: () => new LocalizationRepository(),
        },
        // Services
        VariableTokenizerService,
        TranslationValidatorService,
        OpenAITranslationService,
        // Queue service (optional)
        ...queueProviders,
        // Usecases
        ManageTranslations,
        DeleteTranslationGroup,
        PublishTranslationGroup,
        DuplicateLocales,
        AutoTranslate,
        EnqueueTranslation,
      ],
      exports: [
        // Repositories
        TranslationSettingsRepository,
        LocalizationGroupRepository,
        LocalizationRepository,
        // Services
        VariableTokenizerService,
        TranslationValidatorService,
        OpenAITranslationService,
        // Queue service (optional)
        TranslationQueueService,
        // Usecases
        ManageTranslations,
        DeleteTranslationGroup,
        PublishTranslationGroup,
        DuplicateLocales,
        AutoTranslate,
        EnqueueTranslation,
      ],
      global: true,
    };
  }

  /**
   * Register the translation module for feature modules
   *
   * Use this in feature modules that need access to translation services.
   * The services will be provided from the root module's singletons.
   *
   * @returns Dynamic module configuration
   */
  static forFeature(): DynamicModule {
    return {
      module: TranslationModule,
      providers: [],
      exports: [],
    };
  }
}
