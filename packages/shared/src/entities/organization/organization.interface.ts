import { ApiServiceLevelEnum, IndustryEnum, ProductUseCases } from '../../types';

export type BrandEnrichmentStatus = 'pending' | 'completed' | 'failed' | 'not_available';
export type OnboardingWorkflowsStatus = 'pending' | 'generating' | 'completed' | 'failed' | 'skipped';

export interface IBrandLogo {
  url: string;
  type: 'icon' | 'logo';
  mode: 'light' | 'dark' | 'has_opaque_background';
}

export interface IBrandColor {
  hex: string;
  name: string;
}

export interface IBrandEnrichment {
  industry?: { industry: string; subindustry: string }[];
  companyTitle?: string;
  companyDescription?: string;
  logos?: IBrandLogo[];
  colors?: IBrandColor[];
  enrichedAt?: string;
  status: BrandEnrichmentStatus;
}

export interface IOrganizationEntity {
  _id: string;
  name: string;
  apiServiceLevel?: ApiServiceLevelEnum;
  isTrial?: boolean;
  /** User-configured notification appearance (logo, colors, fonts) in the Novu dashboard. */
  branding?: {
    color: string;
    logo: string;
    fontColor?: string;
    fontFamily?: string;
    contentBackground?: string;
    direction?: 'ltr' | 'rtl';
  };
  defaultLocale?: string;
  targetLocales?: string[];
  domain?: string;
  productUseCases?: ProductUseCases;
  industry?: IndustryEnum;
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
