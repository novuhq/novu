import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { NotificationGroupDBModel } from './notification-group.entity';

// eslint-disable-next-line @typescript-eslint/naming-convention
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

// eslint-disable-next-line @typescript-eslint/naming-convention
export const NotificationGroup =
  (mongoose.models.NotificationGroup as mongoose.Model<NotificationGroupDBModel>) ||
  mongoose.model<NotificationGroupDBModel>('NotificationGroup', NotificationGroupSchema);
