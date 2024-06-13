import { IsDefined, IsEnum, IsOptional, IsString } from 'class-validator';
import { JobTitleEnum } from '../../types';
import { ProductUseCases } from './create-organization.dto';

export class SyncExternalOrganizationDto {
  @IsDefined()
  @IsString()
  externalId: string;

  @IsOptional()
  @IsEnum(JobTitleEnum)
  jobTitle?: JobTitleEnum;

  @IsString()
  @IsOptional()
  domain?: string;

  @IsOptional()
  productUseCases?: ProductUseCases;
}
