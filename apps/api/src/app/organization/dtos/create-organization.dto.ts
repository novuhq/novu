import { IsOptional, IsString } from 'class-validator';
import { ICreateOrganizationDto } from '@novu/shared';

export class CreateOrganizationDto implements ICreateOrganizationDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  logo?: string;
}
