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

export enum OrganizationTypeEnum {
  COMPANY = 'Company',
  AGENCY = 'Agency',
  EDUCATIONAL = 'Student',
  SOLOPRENEUR = 'Solopreneur',
  OTHER = 'Other',
}

export enum CompanySizeEnum {
  LESS_THAN_10 = '<10',
  BETWEEN_10_50 = '10-50',
  BETWEEN_51_100 = '51-100',
  MORE_THAN_100 = '100+',
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

export interface IServicesHashes {
  intercom?: string;
  plain?: string;
}

/**
 * Public metadata can be read from the frontend
 */
export type UserPublicMetadata = {
  profilePicture?: string | null;
  showOnBoarding?: boolean;
  showOnBoardingTour?: number;
  servicesHashes?: IServicesHashes;
  jobTitle?: JobTitleEnum;
};

/**
 * Unsafe metadata can be updated from the frontend
 */
export type UserUnsafeMetadata = {
  newDashboardOptInStatus?: NewDashboardOptInStatusEnum;
};

export enum NewDashboardOptInStatusEnum {
  OPTED_IN = 'opted_in', // user switched to the new dashboard
  DISMISSED = 'dismissed', // user dismissed the opt-in widget
  OPTED_OUT = 'opted_out', // user switched back to the old dashboard
  // undefined -> user has not interacted with the widget yet
}
