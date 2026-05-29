import { OrganizationLevelWithUserCommand } from '@novu/application-generic';
import { IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RotateApiKeyCredentialCommand extends OrganizationLevelWithUserCommand {
  @IsString()
  @IsNotEmpty()
  serviceAccountId: string;

  @IsString()
  @IsNotEmpty()
  apiKeyId: string;

  @IsISO8601()
  @IsOptional()
  expiresAt?: string;
}
