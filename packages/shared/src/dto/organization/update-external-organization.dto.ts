import { IsString, IsOptional, IsEnum } from 'class-validator';
import { JobTitleEnum } from '../../types';

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

  @IsOptional()
  companySize?: string;
}
