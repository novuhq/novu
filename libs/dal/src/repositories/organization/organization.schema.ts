import { ApiServiceLevelEnum } from '@novu/shared';
import mongoose, { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { OrganizationDBModel, PartnerTypeEnum } from './organization.entity';

const organizationSchema = new Schema<OrganizationDBModel>(
  {
    name: Schema.Types.String,
    logo: Schema.Types.String,
    apiServiceLevel: {
      type: Schema.Types.String,
      enum: ApiServiceLevelEnum,
      default: ApiServiceLevelEnum.FREE,
    },
    isTrial: {
      type: Schema.Types.Boolean,
      default: false,
    },
    branding: {
      fontColor: Schema.Types.String,
      contentBackground: Schema.Types.String,
      fontFamily: Schema.Types.String,
      logo: Schema.Types.String,
      color: Schema.Types.String,
      direction: Schema.Types.String,
    },
    partnerConfigurations: {
      type: [
        {
          accessToken: Schema.Types.String,
          configurationId: Schema.Types.String,
          teamId: Schema.Types.String,
          projectIds: [Schema.Types.String],
          partnerType: {
            type: Schema.Types.String,
            enum: PartnerTypeEnum,
          },
        },
      ],
      select: false,
    },
    defaultLocale: Schema.Types.String,
    targetLocales: [Schema.Types.String],
    domain: Schema.Types.String,
    language: [Schema.Types.String],
    removeNovuBranding: Schema.Types.Boolean,
    productUseCases: {
      delay: {
        type: Schema.Types.Boolean,
        default: false,
      },
      translation: {
        type: Schema.Types.Boolean,
        default: false,
      },
      digest: {
        type: Schema.Types.Boolean,
        default: false,
      },
      multi_channel: {
        type: Schema.Types.Boolean,
        default: false,
      },
      in_app: {
        type: Schema.Types.Boolean,
        default: false,
      },
    },
    externalId: Schema.Types.String,
    stripeCustomerId: Schema.Types.String,
    brandEnrichment: {
      type: {
        industry: [
          {
            industry: Schema.Types.String,
            subindustry: Schema.Types.String,
          },
        ],
        companyTitle: Schema.Types.String,
        companyDescription: Schema.Types.String,
        logos: [
          {
            url: Schema.Types.String,
            type: { type: Schema.Types.String, enum: ['icon', 'logo'] },
            mode: { type: Schema.Types.String, enum: ['light', 'dark', 'has_opaque_background'] },
          },
        ],
        colors: [
          {
            hex: Schema.Types.String,
            name: Schema.Types.String,
          },
        ],
        enrichedAt: Schema.Types.String,
        status: {
          type: Schema.Types.String,
          enum: ['pending', 'completed', 'failed', 'not_available'],
          required: true,
        },
      },
      required: false,
    },
    onboardingWorkflowsStatus: {
      type: Schema.Types.String,
      enum: ['pending', 'generating', 'completed', 'failed', 'skipped'],
      required: false,
    },
  },
  schemaOptions
);

if (process.env.NOVU_ENTERPRISE !== 'true') {
  organizationSchema.index(
    { name: 1 },
    {
      unique: true,
      partialFilterExpression: { name: 'Community Edition' },
    }
  );
}

export const Organization =
  (mongoose.models.Organization as mongoose.Model<OrganizationDBModel>) ||
  mongoose.model<OrganizationDBModel>('Organization', organizationSchema);
