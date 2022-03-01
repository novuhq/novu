import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { IntegrationEntity } from './integration.entity';

const integrationSchema = new Schema(
  {
    _applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      index: true,
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    providerId: Schema.Types.String,
    channel: Schema.Types.String,
    credentials: {
      apiKey: Schema.Types.String,
      secretKey: Schema.Types.String,
    },
  },
  schemaOptions
);

interface IIntegrationDocument extends IntegrationEntity, Document {
  // eslint-disable-next-line
  _id: any;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Integration =
  mongoose.models.Integration || mongoose.model<IIntegrationDocument>('Application', integrationSchema);
