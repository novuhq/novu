import mongoose, { Schema } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { LocalizationDBModel } from './localization.entity';

const localizationSchema = new Schema<LocalizationDBModel>(
  {
    locale: {
      type: Schema.Types.String,
      required: true,
    },
    content: {
      type: Schema.Types.String,
      required: true,
    },
    _localizationGroupId: {
      type: Schema.Types.ObjectId,
      ref: 'LocalizationGroup',
      required: true,
    },
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
      required: true,
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
  },
  schemaOptions
);

localizationSchema.index({
  _localizationGroupId: 1,
  locale: 1,
  _environmentId: 1,
  _organizationId: 1,
});

localizationSchema.index({
  _localizationGroupId: 1,
  _environmentId: 1,
  _organizationId: 1,
});

export const Localization =
  (mongoose.models.Localization as mongoose.Model<LocalizationDBModel>) ||
  mongoose.model<LocalizationDBModel>('Localization', localizationSchema);
