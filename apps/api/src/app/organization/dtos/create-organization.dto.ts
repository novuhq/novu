import { IsDefined, IsOptional, IsString } from 'class-validator';
import { ICreateOrganizationDto, JobTitleEnum, ProductUseCases } from '@novu/shared';

export class CreateOrganizationDto implements ICreateOrganizationDto {
  @IsString()
  @IsDefined()
  name: string;

  @IsString()
  @IsOptional()
  logo?: string;

  @IsOptional()
  @IsString()
  jobTitle?: JobTitleEnum;

  @IsString()
  @IsOptional()
  domain?: string;

  @IsOptional()
  productUseCases?: ProductUseCases;
}
