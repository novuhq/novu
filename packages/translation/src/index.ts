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
 * Types:
 * - TokenizeResult, TokenValidationResult: Variable tokenization types
 * - ValidateRequest, ValidationResult, ValidationError: Validation types
 * - TranslateRequest, TranslateResponse: Translation request/response types
 * - BatchTranslateRequest, BatchTranslateResponse: Batch translation types
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
 *   // Types
 *   TranslateRequest,
 *   TranslateResponse,
 * } from '@novu/translation';
 * ```
 */

// DAL exports
export * from './dal';

// Services exports
export * from './services';

// Types exports
export * from './types';

// Module exports
export * from './translation.module';
