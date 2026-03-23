import mongoose, { Schema } from 'mongoose';
import type { ChangePropsValueType } from '../../types/helpers';
import { schemaOptions } from '../schema-default.options';
import { TranslationGroupEntity } from './translation-group.entity';

const mongooseDelete = require('mongoose-delete');

export type TranslationGroupModel = ChangePropsValueType<TranslationGroupEntity, '_environmentId' | '_organizationId'>;

const translationGroupSchema = new Schema<TranslationGroupModel>(
  {
    name: Schema.Types.String,
    identifier: Schema.Types.String,
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    _parentId: {
      type: Schema.Types.ObjectId,
      ref: 'TranslationGroup',
    },
  },
  schemaOptions
);

translationGroupSchema.virtual('translations', {
  ref: 'Translation',
  localField: '_id',
  foreignField: '_groupId',
});

translationGroupSchema.plugin(mongooseDelete, { deletedAt: true, deletedBy: true, overrideMethods: 'all' });

export const TranslationGroup =
  mongoose.models.TranslationGroup || mongoose.model<TranslationGroupModel>('TranslationGroup', translationGroupSchema);
