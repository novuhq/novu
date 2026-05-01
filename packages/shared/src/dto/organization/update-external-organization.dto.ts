import { ChannelTypeEnum, IndustryEnum, JobTitleEnum, OrganizationTypeEnum } from '../../types';

export type UpdateExternalOrganizationDto = {
  jobTitle?: JobTitleEnum;
  domain?: string;
  language?: string[];
  frontendStack?: string[];
  companySize?: string;
  organizationType?: OrganizationTypeEnum;
  useCases?: ChannelTypeEnum[];
  industry?: IndustryEnum;
};
