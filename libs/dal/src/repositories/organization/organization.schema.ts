import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { OrganizationEntity, PartnerTypeEnum } from './organization.entity';

const organizationSchema = new Schema(
  {
    name: Schema.Types.String,
    logo: Schema.Types.String,
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
  },
  schemaOptions
);

interface IOrganizationDocument extends OrganizationEntity, Document {
  _id: never;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Organization =
  mongoose.models.Organization || mongoose.model<IOrganizationDocument>('Organization', organizationSchema);
