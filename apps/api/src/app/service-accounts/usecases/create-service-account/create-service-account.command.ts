import { OrganizationLevelWithUserCommand } from '@novu/application-generic';
import { PermissionsEnum, ServiceAccountScopeEnum } from '@novu/shared';
import { IsArray, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateServiceAccountCommand extends OrganizationLevelWithUserCommand {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ServiceAccountScopeEnum)
  scope: ServiceAccountScopeEnum;

  @IsString()
  @IsOptional()
  environmentId?: string;

  @IsArray()
  @IsOptional()
  defaultPermissions?: PermissionsEnum[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
