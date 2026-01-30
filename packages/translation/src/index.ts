/**
 * @novu/translation
 *
 * AI-powered translation services for Novu notification content.
 * This package provides a complete translation solution including:
 *
 * Phase 1: Package Foundation
 * - TranslationSettingsEntity: Entity definition for translation settings
 * - TranslationSettingsRepository: Repository for CRUD operations
 * - TranslationModule: NestJS module for dependency injection
 *
 * Phase 2: Core Services
 * - VariableTokenizerService: Protects template variables during translation
 * - TranslationValidatorService: Validates translated content integrity
 * - OpenAITranslationService: Orchestrates translation via OpenAI
 *
 * Phase 3: Usecases (CQRS Pattern)
 * - ManageTranslations: Enable/disable translations on resources
 * - DeleteTranslationGroup: Cleanup when resource is deleted
 * - PublishTranslationGroup: Sync translations between environments
 * - DuplicateLocales: Copy translations when duplicating resources
 * - AutoTranslate: Trigger automatic translation using OpenAI
 *
 * Phase 4: API Controllers
 * - TranslationSettingsController: Manage organization translation settings
 * - TranslationController: Trigger translations and check job status
 *
 * DTOs:
 * - UpdateTranslationSettingsDto: Request DTO for updating settings
 * - TranslationSettingsResponseDto: Response DTO with masked API key
 * - ConnectionTestResponseDto: Response for connection test
 * - AutoTranslateRequestDto: Request DTO for auto-translate
 * - AutoTranslateResponseDto: Response DTO for auto-translate
 * - TranslationStatusDto: Status DTO for async jobs
 *
 * Types:
 * - TokenizeResult, TokenValidationResult: Variable tokenization types
 * - ValidateRequest, ValidationResult, ValidationError: Validation types
 * - TranslateRequest, TranslateResponse: Translation request/response types
 * - BatchTranslateRequest, BatchTranslateResponse: Batch translation types
 * - AutoTranslateResult, LocaleTranslateResult: Auto-translate result types
 *
 * Usage:
 * ```typescript
 * import {
 *   // Module
 *   TranslationModule,
 *
 *   // DAL
 *   TranslationSettingsRepository,
 *   TranslationSettingsEntity,
 *   OpenAIModelEnum,
 *
 *   // Services
 *   VariableTokenizerService,
 *   TranslationValidatorService,
 *   OpenAITranslationService,
 *
 *   // Usecases
 *   ManageTranslations,
 *   ManageTranslationsCommand,
 *   DeleteTranslationGroup,
 *   DeleteTranslationGroupCommand,
 *   PublishTranslationGroup,
 *   PublishTranslationGroupCommand,
 *   DuplicateLocales,
 *   DuplicateLocalesCommand,
 *   AutoTranslate,
 *   AutoTranslateCommand,
 *   LocalizationResourceEnum,
 *
 *   // Controllers
 *   TranslationSettingsController,
 *   TranslationController,
 *
 *   // DTOs
 *   UpdateTranslationSettingsDto,
 *   TranslationSettingsResponseDto,
 *   AutoTranslateRequestDto,
 *   AutoTranslateResponseDto,
 *
 *   // Types
 *   TranslateRequest,
 *   TranslateResponse,
 *   AutoTranslateResult,
 * } from '@novu/translation';
 * ```
 */

// DAL exports
export * from './dal';

// Services exports
export * from './services';

// Types exports
export * from './types';

// Usecases exports
export * from './usecases';

// Controllers exports
export * from './controllers';

// DTOs exports
export * from './dtos';

// Module exports
export * from './translation.module';
