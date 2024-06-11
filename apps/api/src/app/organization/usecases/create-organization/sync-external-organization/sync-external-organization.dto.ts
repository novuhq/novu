import { IsDefined, IsEnum, IsOptional, IsString } from 'class-validator';
import { JobTitleEnum, ProductUseCases } from '@novu/shared';

export class SyncExternalOrganizationDto {
  @IsDefined()
  @IsString()
  externalOrganizationId: string;

  @IsOptional()
  @IsEnum(JobTitleEnum)
  jobTitle?: JobTitleEnum;

  @IsString()
  @IsOptional()
  domain?: string;

  @IsOptional()
  productUseCases?: ProductUseCases;
}
