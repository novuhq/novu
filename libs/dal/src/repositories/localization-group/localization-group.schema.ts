import mongoose, { Schema } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { LocalizationGroupDBModel, LocalizationResourceEnum } from './localization-group.entity';

const localizationGroupSchema = new Schema<LocalizationGroupDBModel>(
  {
    resourceType: {
      type: Schema.Types.String,
      enum: Object.values(LocalizationResourceEnum),
      required: true,
    },
    resourceId: {
      type: Schema.Types.String,
      required: true,
    },
    _resourceInternalId: {
      type: Schema.Types.ObjectId,
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

export const LocalizationGroup =
  (mongoose.models.LocalizationGroup as mongoose.Model<LocalizationGroupDBModel>) ||
  mongoose.model<LocalizationGroupDBModel>('LocalizationGroup', localizationGroupSchema);
