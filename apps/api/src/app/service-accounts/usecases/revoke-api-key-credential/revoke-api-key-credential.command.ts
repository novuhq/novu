import { OrganizationLevelWithUserCommand } from '@novu/application-generic';
import { IsNotEmpty, IsString } from 'class-validator';

export class RevokeApiKeyCredentialCommand extends OrganizationLevelWithUserCommand {
  @IsString()
  @IsNotEmpty()
  serviceAccountId: string;

  @IsString()
  @IsNotEmpty()
  apiKeyId: string;
}
