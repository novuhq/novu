import { IsDefined, IsString, IsOptional, IsEnum } from 'class-validator';
import { JobTitleEnum } from '../../types';
import { ProductUseCases } from './create-organization.dto';

export class UpdateExternalOrganizationDto {
  @IsOptional()
  @IsEnum(JobTitleEnum)
  jobTitle?: JobTitleEnum;

  @IsString()
  @IsOptional()
  domain?: string;

  @IsOptional()
  language?: string[];

  @IsOptional()
  frontendStack?: string[];
}
