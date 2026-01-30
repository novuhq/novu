import { Model, Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { encryptApiKey, decryptApiKey } from '@novu/application-generic';

import {
  OpenAIModelEnum,
  TranslationSettingsDBModel,
  TranslationSettingsEntity,
} from './translation-settings.entity';
import { TranslationSettings } from './translation-settings.schema';

/**
 * Input type for creating/updating translation settings
 */
export interface UpsertTranslationSettingsInput {
  openaiApiKey?: string;
  openaiModel?: OpenAIModelEnum;
  defaultLocale?: string;
  targetLocales?: string[];
}

/**
 * Repository for managing translation settings in MongoDB
 *
 * Follows Novu's repository pattern from libs/dal but is self-contained
 * within the translation package to avoid modifying the core DAL.
 *
 * Key features:
 * - Automatic encryption of OpenAI API key on storage
 * - Automatic decryption of OpenAI API key on retrieval
 * - One settings document per organization (unique constraint)
 * - Upsert support for create-or-update operations
 */
export class TranslationSettingsRepository {
  private readonly model: Model<TranslationSettingsDBModel>;

  constructor() {
    this.model = TranslationSettings;
  }

  /**
   * Convert ObjectId to string
   */
  private convertObjectIdToString(value: Types.ObjectId): string {
    return value.toString();
  }

  /**
   * Convert string to ObjectId
   */
  private convertStringToObjectId(value: string): Types.ObjectId {
    return new Types.ObjectId(value);
  }

  /**
   * Map database document to entity with decrypted API key
   */
  private mapEntity(data: TranslationSettingsDBModel | null): TranslationSettingsEntity | null {
    if (!data) {
      return null;
    }

    const plain = JSON.parse(JSON.stringify(data));
    const entity = plainToInstance(TranslationSettingsEntity, plain);

    // Decrypt the API key when retrieving from database
    if (entity.openaiApiKey) {
      try {
        entity.openaiApiKey = decryptApiKey(entity.openaiApiKey);
      } catch {
        // If decryption fails, the key might not be encrypted yet
        // This handles migration scenarios
      }
    }

    return entity;
  }

  /**
   * Find translation settings by organization ID
   *
   * @param organizationId - The organization ID to find settings for
   * @returns The translation settings entity or null if not found
   */
  async findByOrganization(organizationId: string): Promise<TranslationSettingsEntity | null> {
    const result = await this.model
      .findOne({
        _organizationId: this.convertStringToObjectId(organizationId),
      })
      .lean();

    return this.mapEntity(result as TranslationSettingsDBModel | null);
  }

  /**
   * Create or update translation settings for an organization
   *
   * If settings exist, they are updated with the provided values.
   * If settings don't exist, they are created.
   *
   * The OpenAI API key is automatically encrypted before storage.
   *
   * @param organizationId - The organization ID to upsert settings for
   * @param settings - Partial settings to create or update
   * @returns The upserted translation settings entity
   */
  async upsertSettings(
    organizationId: string,
    settings: UpsertTranslationSettingsInput
  ): Promise<TranslationSettingsEntity> {
    const updateData: Partial<TranslationSettingsDBModel> = {};

    // Encrypt the API key before storing
    if (settings.openaiApiKey !== undefined) {
      updateData.openaiApiKey = encryptApiKey(settings.openaiApiKey);
    }

    if (settings.openaiModel !== undefined) {
      updateData.openaiModel = settings.openaiModel;
    }

    if (settings.defaultLocale !== undefined) {
      updateData.defaultLocale = settings.defaultLocale;
    }

    if (settings.targetLocales !== undefined) {
      updateData.targetLocales = settings.targetLocales;
    }

    const result = await this.model.findOneAndUpdate(
      { _organizationId: this.convertStringToObjectId(organizationId) },
      { $set: updateData },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    const entity = this.mapEntity(result as unknown as TranslationSettingsDBModel);

    if (!entity) {
      throw new Error('Failed to upsert translation settings');
    }

    return entity;
  }

  /**
   * Delete translation settings for an organization
   *
   * @param organizationId - The organization ID to delete settings for
   * @returns True if settings were deleted, false if not found
   */
  async deleteByOrganization(organizationId: string): Promise<boolean> {
    const result = await this.model.deleteOne({
      _organizationId: this.convertStringToObjectId(organizationId),
    });

    return result.deletedCount > 0;
  }

  /**
   * Check if translation settings exist for an organization
   *
   * @param organizationId - The organization ID to check
   * @returns True if settings exist
   */
  async exists(organizationId: string): Promise<boolean> {
    const count = await this.model.countDocuments({
      _organizationId: this.convertStringToObjectId(organizationId),
    });

    return count > 0;
  }

  /**
   * Get decrypted API key for an organization
   * Useful when you only need the API key without the full settings
   *
   * @param organizationId - The organization ID
   * @returns The decrypted API key or null if not found
   */
  async getDecryptedApiKey(organizationId: string): Promise<string | null> {
    const settings = await this.findByOrganization(organizationId);

    return settings?.openaiApiKey ?? null;
  }
}
