import { Module, DynamicModule, Global } from '@nestjs/common';

import { TranslationSettingsRepository } from './dal';
import {
  VariableTokenizerService,
  TranslationValidatorService,
  OpenAITranslationService,
} from './services';

/**
 * TranslationModule provides translation services and repository access
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
 * - TranslationSettingsRepository: For managing translation settings
 * - VariableTokenizerService: For tokenizing/detokenizing template variables
 * - TranslationValidatorService: For validating translated content
 * - OpenAITranslationService: For translating content via OpenAI
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
   * It provides all translation services as singletons.
   *
   * @returns Dynamic module configuration
   */
  static forRoot(): DynamicModule {
    return {
      module: TranslationModule,
      providers: [
        {
          provide: TranslationSettingsRepository,
          useFactory: () => new TranslationSettingsRepository(),
        },
        VariableTokenizerService,
        TranslationValidatorService,
        OpenAITranslationService,
      ],
      exports: [
        TranslationSettingsRepository,
        VariableTokenizerService,
        TranslationValidatorService,
        OpenAITranslationService,
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
