import { OrganizationLevelWithUserCommand } from '@novu/application-generic';
import { PermissionsEnum } from '@novu/shared';
import { IsArray, IsISO8601, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateApiKeyCredentialCommand extends OrganizationLevelWithUserCommand {
  @IsString()
  @IsNotEmpty()
  serviceAccountId: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @IsOptional()
  permissions?: PermissionsEnum[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsISO8601()
  @IsOptional()
  expiresAt?: string;
}
