import mongoose, { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { NotificationGroupDBModel } from './notification-group.entity';

const NotificationGroupSchema = new Schema<NotificationGroupDBModel>(
  {
    name: Schema.Types.String,
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
      index: true,
    },
    _parentId: {
      type: Schema.Types.ObjectId,
      ref: 'NotificationGroup',
    },
  },
  schemaOptions
);

NotificationGroupSchema.index({
  _organizationId: 1,
});

NotificationGroupSchema.index({
  _environmentId: 1,
});

export const NotificationGroup =
  (mongoose.models.NotificationGroup as mongoose.Model<NotificationGroupDBModel>) ||
  mongoose.model<NotificationGroupDBModel>('NotificationGroup', NotificationGroupSchema);
