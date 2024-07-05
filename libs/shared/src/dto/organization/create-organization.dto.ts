import { JobTitleEnum, ProductUseCasesEnum } from '../../types';

export type ProductUseCases = Partial<Record<ProductUseCasesEnum, boolean>>;

export interface ICreateOrganizationDto {
  name: string;
  logo?: string;
  taxIdentifier?: string;
  jobTitle?: JobTitleEnum;
  domain?: string;
  language?: string[];
  frontend?: string[];
}

export interface IOrganizationDTO {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
