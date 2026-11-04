import { DomainStatusEnum } from '@novu/shared';
import mongoose, { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { DomainDBModel } from './domain.entity';

const domainSchema = new Schema<DomainDBModel>(
  {
    name: {
      type: Schema.Types.String,
      required: true,
    },
    status: {
      type: Schema.Types.String,
      enum: Object.values(DomainStatusEnum),
      default: DomainStatusEnum.PENDING,
    },
    mxRecordConfigured: {
      type: Schema.Types.Boolean,
      default: false,
    },
    dnsProvider: {
      type: Schema.Types.String,
    },
    data: {
      type: Schema.Types.Mixed,
    },
    /*
     * No defaults. An absent object or flag means that check is required;
     * the read path fills both flags in.
     */
    inboundSenderAuth: {
      type: new Schema(
        {
          dkim: { type: Schema.Types.Boolean },
          spf: { type: Schema.Types.Boolean },
        },
        { _id: false }
      ),
      required: false,
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

/*
 * Custom domains are globally unique — a DNS name cannot be claimed by more
 * than one organisation.
 */
domainSchema.index({ name: 1 }, { unique: true });

/*
 * Supports listDomains queries scoped to a specific environment
 */
domainSchema.index({ _environmentId: 1 });

export const Domain =
  (mongoose.models.Domain as mongoose.Model<DomainDBModel>) || mongoose.model<DomainDBModel>('Domain', domainSchema);
