import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';
import * as mongooseDelete from 'mongoose-delete';

import { schemaOptions } from '../schema-default.options';
import { IntegrationDBModel } from './integration.entity';

const integrationSchema = new Schema<IntegrationDBModel>(
  {
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
      index: true,
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    providerId: Schema.Types.String,
    channel: Schema.Types.String,
    credentials: {
      apiKey: Schema.Types.String,
      user: Schema.Types.String,
      secretKey: Schema.Types.String,
      domain: Schema.Types.String,
      password: Schema.Types.String,
      host: Schema.Types.String,
      port: Schema.Types.String,
      secure: Schema.Types.Boolean,
      region: Schema.Types.String,
      accountSid: Schema.Types.String,
      messageProfileId: Schema.Types.String,
      token: Schema.Types.String,
      from: Schema.Types.String,
      senderName: Schema.Types.String,
      applicationId: Schema.Types.String,
      clientId: Schema.Types.String,
      projectName: Schema.Types.String,
      serviceAccount: Schema.Types.String,
      baseUrl: Schema.Types.String,
      webhookUrl: Schema.Types.String,
      requireTls: Schema.Types.Boolean,
      ignoreTls: Schema.Types.Boolean,
      tlsOptions: Schema.Types.Mixed,
      redirectUrl: Schema.Types.String,
      hmac: Schema.Types.Boolean,
      ipPoolName: Schema.Types.String,
      apiKeyRequestHeader: Schema.Types.String,
      secretKeyRequestHeader: Schema.Types.String,
      idPath: Schema.Types.String,
      datePath: Schema.Types.String,
      authenticateByToken: Schema.Types.Boolean,
      authenticationTokenKey: Schema.Types.String,
      instanceId: Schema.Types.String,
      alertUid: Schema.Types.String,
      title: Schema.Types.String,
      imageUrl: Schema.Types.String,
      state: Schema.Types.String,
      externalLink: Schema.Types.String,
      apiToken: Schema.Types.String,
      channelId: Schema.Types.String,
    },
    active: {
      type: Schema.Types.Boolean,
      default: false,
    },
    name: Schema.Types.String,
    identifier: Schema.Types.String,
    priority: {
      type: Schema.Types.Number,
      default: 0,
    },
    primary: {
      type: Schema.Types.Boolean,
      default: false,
    },
    conditions: [
      {
        isNegated: Schema.Types.Boolean,
        type: {
          type: Schema.Types.String,
        },
        value: Schema.Types.String,
        children: [
          {
            field: Schema.Types.String,
            value: Schema.Types.Mixed,
            operator: Schema.Types.String,
            on: Schema.Types.String,
          },
        ],
      },
    ],
  },
  schemaOptions
);

integrationSchema.index({
  _organizationId: 1,
  active: 1,
});

integrationSchema.plugin(mongooseDelete, { deletedAt: true, deletedBy: true, overrideMethods: 'all' });

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Integration =
  (mongoose.models.Integration as mongoose.Model<IntegrationDBModel>) ||
  mongoose.model<IntegrationDBModel>('Integration', integrationSchema);
