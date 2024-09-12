import { ProductUseCases } from '../../dto';
import { ApiServiceLevelEnum, JobTitleEnum } from '../organization';
import { IServicesHashes } from '../../entities/user';

export type OrganizationPublicMetadata = {
  externalOrgId?: string;
  apiServiceLevel?: ApiServiceLevelEnum;
  domain?: string;
  productUseCases?: ProductUseCases;
  language?: string[];
  defaultLocale?: string;
};

export type UserPublicMetadata = {
  profilePicture?: string | null;
  showOnBoarding?: boolean;
  showOnBoardingTour?: number;
  servicesHashes?: IServicesHashes;
  jobTitle?: JobTitleEnum;
};
