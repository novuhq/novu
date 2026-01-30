/**
 * Translation Controllers
 *
 * NestJS controllers for the translation API endpoints.
 * These controllers are designed to be imported into apps/api during Phase 5 integration.
 *
 * Controllers:
 * - TranslationSettingsController: Manage organization translation settings
 * - TranslationController: Trigger translations and check job status
 *
 * Usage in apps/api:
 * ```typescript
 * import {
 *   TranslationSettingsController,
 *   TranslationController,
 * } from '@novu/translation';
 *
 * @Module({
 *   controllers: [
 *     TranslationSettingsController,
 *     TranslationController,
 *   ],
 * })
 * export class TranslationApiModule {}
 * ```
 */

export * from "./translation.controller";
export * from "./translation-settings.controller";
