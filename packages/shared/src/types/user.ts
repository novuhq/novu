export type UserId = string;

export enum JobTitleEnum {
  ENGINEER = 'engineer',
  ENGINEERING_MANAGER = 'engineering_manager',
  ARCHITECT = 'architect',
  PRODUCT_MANAGER = 'product_manager',
  DESIGNER = 'designer',
  FOUNDER = 'cxo_founder',
  MARKETING_MANAGER = 'marketing_manager',
  STUDENT = 'student',
  CXO = 'cxo',
  OTHER = 'other',
}

export const jobTitleToLabelMapper = {
  [JobTitleEnum.ENGINEER]: 'Engineer',
  [JobTitleEnum.ARCHITECT]: 'Architect',
  [JobTitleEnum.PRODUCT_MANAGER]: 'Product Manager',
  [JobTitleEnum.DESIGNER]: 'Designer',
  [JobTitleEnum.ENGINEERING_MANAGER]: 'Engineering Manager',
  [JobTitleEnum.FOUNDER]: 'Founder',
  [JobTitleEnum.STUDENT]: 'Student',
  [JobTitleEnum.CXO]: 'CXO (CTO/CEO/other...)',
  [JobTitleEnum.MARKETING_MANAGER]: 'Marketing Manager',
  [JobTitleEnum.OTHER]: 'Other',
};

export type UserPublicMetadata = {
  profilePicture?: string | null;
  showOnBoarding?: boolean;
  showOnBoardingTour?: number;
  servicesHashes?: IServicesHashes;
  jobTitle?: JobTitleEnum;
};

export interface IServicesHashes {
  intercom?: string;
}
