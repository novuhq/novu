import { DomainRouteTypeEnum } from '@novu/shared';
import mongoose, { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { DomainRouteDBModel } from './domain-route.entity';

const domainRouteSchema = new Schema<DomainRouteDBModel>(
  {
    _domainId: {
      type: Schema.Types.ObjectId,
      ref: 'Domain',
      required: true,
    },
    address: {
      type: Schema.Types.String,
      required: true,
    },
    destination: {
      type: Schema.Types.String,
    },
    type: {
      type: Schema.Types.String,
      enum: Object.values(DomainRouteTypeEnum),
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
    },
  },
  schemaOptions
);

domainRouteSchema.index({ _domainId: 1, _id: 1 });
domainRouteSchema.index({ _domainId: 1, address: 1 }, { unique: true });
domainRouteSchema.index({ _environmentId: 1 });

export const DomainRoute =
  (mongoose.models.DomainRoute as mongoose.Model<DomainRouteDBModel>) ||
  mongoose.model<DomainRouteDBModel>('DomainRoute', domainRouteSchema);
