import mongoose, { Schema } from 'mongoose';
import type { ChangePropsValueType } from '../../types/helpers';
import { schemaOptions } from '../schema-default.options';
import { TranslationEntity } from './translation.entity';

const mongooseDelete = require('mongoose-delete');

export type TranslationModel = ChangePropsValueType<
  TranslationEntity,
  '_environmentId' | '_organizationId' | '_groupId'
>;

const translationSchema = new Schema<TranslationModel>(
  {
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    _groupId: {
      type: Schema.Types.ObjectId,
      ref: 'TranslationGroup',
    },
    isoLanguage: Schema.Types.String,
    fileName: Schema.Types.String,
    translations: Schema.Types.Mixed,
    _parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Translation',
    },
  },
  schemaOptions
);

translationSchema.plugin(mongooseDelete, { deletedAt: true, deletedBy: true, overrideMethods: 'all' });

export const Translation =
  mongoose.models.Translation || mongoose.model<TranslationModel>('Translation', translationSchema);
