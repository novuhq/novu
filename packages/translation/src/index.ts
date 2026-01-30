/**
 * @novu/translation
 *
 * AI-powered translation services for Novu notification content.
 * This package provides translation settings management and will be extended
 * with translation services in subsequent phases.
 *
 * Phase 1: Package Foundation (current)
 * - TranslationSettingsEntity: Entity definition for translation settings
 * - TranslationSettingsRepository: Repository for CRUD operations
 * - TranslationModule: NestJS module for dependency injection
 *
 * Phase 2+: Core Services (upcoming)
 * - TranslationService: OpenAI-powered translation
 * - TranslationCacheService: Caching layer for translated content
 *
 * Usage:
 * ```typescript
 * import {
 *   TranslationModule,
 *   TranslationSettingsRepository,
 *   TranslationSettingsEntity,
 *   OpenAIModelEnum,
 * } from '@novu/translation';
 * ```
 */

// DAL exports
export * from './dal';

// Module exports
export * from './translation.module';
