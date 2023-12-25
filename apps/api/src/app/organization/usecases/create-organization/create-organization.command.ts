import { IsDefined, IsOptional, IsString } from 'class-validator';

import { ProductUseCases } from '@novu/shared';

import { AuthenticatedCommand } from '../../../shared/commands/authenticated.command';

export class CreateOrganizationCommand extends AuthenticatedCommand {
  @IsString()
  @IsDefined()
  public readonly name: string;

  @IsString()
  @IsOptional()
  public readonly logo?: string;

  @IsString()
  @IsOptional()
  jobTitle?: string;

  @IsString()
  @IsOptional()
  domain?: string;

  @IsOptional()
  productUseCases?: ProductUseCases;
}
