import { Types } from 'mongoose';

/**
 * Type helper for changing property value types in an entity
 * Used to convert string IDs to ObjectIds in the DB model
 * Defined locally to avoid dependency on @novu/dal
 */
type ChangePropsValueType<T, K extends keyof T, V = Types.ObjectId> = Omit<T, K> & {
  [P in K]: V;
};

/**
 * Supported OpenAI models for translation
 */
export enum OpenAIModelEnum {
  GPT_4O_MINI = 'gpt-4o-mini',
  GPT_4O = 'gpt-4o',
  GPT_4_TURBO = 'gpt-4-turbo',
}

/**
 * Translation settings entity for storing organization-level translation configuration
 */
export class TranslationSettingsEntity {
  /**
   * Unique identifier for the translation settings
   */
  _id: string;

  /**
   * Organization ID - unique constraint, one settings per organization
   */
  _organizationId: string;

  /**
   * OpenAI API key (AES-256 encrypted at rest)
   */
  openaiApiKey: string;

  /**
   * OpenAI model to use for translation
   * Defaults to gpt-4o-mini for cost-effective translation
   */
  openaiModel: OpenAIModelEnum;

  /**
   * Default source locale for translations
   * BCP-47 language tag (e.g., "en_US", "en_GB")
   */
  defaultLocale: string;

  /**
   * Target locales for translation
   * Array of BCP-47 language tags (e.g., ["es_ES", "fr_FR", "de_DE"])
   */
  targetLocales: string[];

  /**
   * Timestamp when settings were created
   */
  createdAt: string;

  /**
   * Timestamp when settings were last updated
   */
  updatedAt: string;
}

/**
 * Database model type with ObjectId references
 */
export type TranslationSettingsDBModel = ChangePropsValueType<
  TranslationSettingsEntity,
  '_organizationId'
>;
