import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { EnvironmentEntity } from './environment.entity';

const environmentSchema = new Schema(
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
        key: {
          type: Schema.Types.String,
          unique: true,
        },
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
    _parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
    },
  },
  schemaOptions
);

interface IEnvironmentDocument extends EnvironmentEntity, Document {
  // eslint-disable-next-line
  _id: any;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Environment =
  mongoose.models.Environment || mongoose.model<IEnvironmentDocument>('Environment', environmentSchema);
