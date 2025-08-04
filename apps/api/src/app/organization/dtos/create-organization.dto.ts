import { ICreateOrganizationDto, JobTitleEnum, ProductUseCases } from '@novu/shared';
import { IsDefined, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateOrganizationDto implements ICreateOrganizationDto {
  @IsString()
  @IsDefined()
  name: string;

  @IsString()
  @IsOptional()
  logo?: string;

  @IsOptional()
  @IsEnum(JobTitleEnum)
  jobTitle?: JobTitleEnum;

  @IsString()
  @IsOptional()
  domain?: string;

  @IsOptional()
  language?: string[];
}
