import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { ApplicationEntity } from './application.entity';

const applicationSchema = new Schema(
  {
    name: Schema.Types.String,
    identifier: {
      type: Schema.Types.String,
      unique: true,
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    apiKeys: [
      {
        key: Schema.Types.String,
        _userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
    branding: {
      fontColor: Schema.Types.String,
      contentBackground: Schema.Types.String,
      fontFamily: Schema.Types.String,
      logo: Schema.Types.String,
      color: Schema.Types.String,
      direction: Schema.Types.String,
    },
  },
  schemaOptions
);

interface IApplicationDocument extends ApplicationEntity, Document {
  // eslint-disable-next-line
  _id: any;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Application =
  mongoose.models.Application || mongoose.model<IApplicationDocument>('Application', applicationSchema);
