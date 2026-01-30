import mongoose, { Schema } from 'mongoose';

import {
  OpenAIModelEnum,
  TranslationSettingsDBModel,
} from './translation-settings.entity';

/**
 * Schema options for translation settings
 * - timestamps: automatically manage createdAt and updatedAt
 * - id: create virtual id property
 * - toJSON/toObject: include virtuals in serialization
 */
const schemaOptions = {
  timestamps: true,
  id: true,
  toJSON: {
    virtuals: true,
  },
  toObject: { virtuals: true },
};

/**
 * Mongoose schema for translation settings
 */
const translationSettingsSchema = new Schema<TranslationSettingsDBModel>(
  {
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true,
      index: true,
    },
    openaiApiKey: {
      type: Schema.Types.String,
      required: true,
    },
    openaiModel: {
      type: Schema.Types.String,
      enum: Object.values(OpenAIModelEnum),
      default: OpenAIModelEnum.GPT_4O_MINI,
      required: true,
    },
    defaultLocale: {
      type: Schema.Types.String,
      default: 'en_US',
      required: true,
    },
    targetLocales: {
      type: [Schema.Types.String],
      default: [],
      required: true,
    },
  },
  schemaOptions
);

/**
 * Index for efficient organization lookups
 * Unique constraint ensures one settings document per organization
 */
translationSettingsSchema.index({ _organizationId: 1 }, { unique: true });

/**
 * TranslationSettings Mongoose model
 * Uses conditional model creation to prevent model overwrite errors during hot reloads
 */
export const TranslationSettings =
  (mongoose.models.TranslationSettings as mongoose.Model<TranslationSettingsDBModel>) ||
  mongoose.model<TranslationSettingsDBModel>(
    'TranslationSettings',
    translationSettingsSchema
  );
