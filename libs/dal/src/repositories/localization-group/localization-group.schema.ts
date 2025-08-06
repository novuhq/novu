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
    resourceName: {
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

localizationGroupSchema.index({
  resourceType: 1,
  _resourceInternalId: 1,
  _environmentId: 1,
  _organizationId: 1,
});

localizationGroupSchema.index({
  _environmentId: 1,
  _organizationId: 1,
  updatedAt: -1,
});

export const LocalizationGroup =
  (mongoose.models.LocalizationGroup as mongoose.Model<LocalizationGroupDBModel>) ||
  mongoose.model<LocalizationGroupDBModel>('LocalizationGroup', localizationGroupSchema);
