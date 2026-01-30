/**
 * Translation Usecases
 *
 * CQRS-style usecases for managing translations on resources.
 *
 * Each usecase follows the pattern:
 * - Command: Input data with validation
 * - Usecase: Business logic execution
 * - Result: Output data structure
 *
 * Available usecases:
 *
 * ManageTranslations: Enable/disable translations on workflows/layouts
 * - Creates LocalizationGroup when enabling
 * - Soft-disables when disabling (preserves data)
 * - Signals when auto-translate should be triggered
 *
 * DeleteTranslationGroup: Cleanup when resource is deleted
 * - Cascading delete of LocalizationGroup and child Localizations
 * - Safe to call even if no translations exist
 *
 * PublishTranslationGroup: Sync translations between environments
 * - Copies LocalizationGroup from source to target environment
 * - Updates existing localizations, creates new ones
 *
 * DuplicateLocales: Copy translations when cloning a resource
 * - Creates new LocalizationGroup for target resource
 * - Clones all Localization documents
 *
 * AutoTranslate: Trigger automatic translation using OpenAI
 * - Extracts translatable content from resource
 * - Calls OpenAI service for each target locale
 * - Stores translated content in Localizations
 * - Handles validation and partial failures
 */

// ManageTranslations
export {
  ManageTranslationsCommand,
  LocalizationResourceEnum,
} from './manage-translations';
export {
  ManageTranslations,
  ManageTranslationsResult,
} from './manage-translations';

// DeleteTranslationGroup
export {
  DeleteTranslationGroupCommand,
} from './delete-translation-group';
export {
  DeleteTranslationGroup,
  DeleteTranslationGroupResult,
} from './delete-translation-group';

// PublishTranslationGroup
export {
  PublishTranslationGroupCommand,
  UserSessionData,
} from './publish-translation-group';
export {
  PublishTranslationGroup,
  PublishTranslationGroupResult,
} from './publish-translation-group';

// DuplicateLocales
export {
  DuplicateLocalesCommand,
} from './duplicate-locales';
export {
  DuplicateLocales,
  DuplicateLocalesResult,
} from './duplicate-locales';

// AutoTranslate
export {
  AutoTranslateCommand,
  AutoTranslateResult,
  LocaleTranslateResult,
  TranslationContentType,
} from './auto-translate';
export {
  AutoTranslate,
} from './auto-translate';
