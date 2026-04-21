import {
  ApiServiceLevelEnum,
  IBrandEnrichment,
  IOrganizationEntity,
  OnboardingWorkflowsStatus,
  ProductUseCases,
} from '@novu/shared';

export class OrganizationEntity implements IOrganizationEntity {
  _id: string;

  name: string;

  logo?: string;

  apiServiceLevel: ApiServiceLevelEnum;

  isTrial?: boolean;

  /** User-configured notification appearance (logo, colors, fonts) in the Novu dashboard. */
  branding?: Branding;

  partnerConfigurations?: IPartnerConfiguration[];

  defaultLocale?: string;

  targetLocales?: string[];

  domain?: string;

  productUseCases?: ProductUseCases;

  language?: string[];

  removeNovuBranding?: boolean;

  /** External brand profile (industry, assets, copy) + enrichment pipeline status; used for AI onboarding, not in-app branding. */
  brandEnrichment?: IBrandEnrichment;

  /** Lifecycle of AI-generated onboarding workflow templates (snapshots). */
  onboardingWorkflowsStatus?: OnboardingWorkflowsStatus;

  createdAt: string;

  updatedAt: string;

  externalId?: string;

  stripeCustomerId?: string;

  createdBy?: string;
}

export type Branding = {
  fontFamily?: string;
  fontColor?: string;
  contentBackground?: string;
  logo: string;
  color: string;
  direction?: 'ltr' | 'rtl';
};

export type OrganizationDBModel = OrganizationEntity;

export interface IPartnerConfiguration {
  accessToken: string;
  configurationId: string;
  projectIds?: string[];
  teamId: string;
  partnerType: PartnerTypeEnum;
}

export enum PartnerTypeEnum {
  VERCEL = 'vercel',
}

export enum DirectionEnum {
  LTR = 'ltr',
  RTL = 'trl',
}
