import { Module, DynamicModule, Global } from '@nestjs/common';
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
} from './usecases';

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
   * @returns Dynamic module configuration
   */
  static forRoot(): DynamicModule {
    return {
      module: TranslationModule,
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
        // Usecases
        ManageTranslations,
        DeleteTranslationGroup,
        PublishTranslationGroup,
        DuplicateLocales,
        AutoTranslate,
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
        // Usecases
        ManageTranslations,
        DeleteTranslationGroup,
        PublishTranslationGroup,
        DuplicateLocales,
        AutoTranslate,
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
