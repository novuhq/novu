import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { IsDomainConnectRedirectUrl } from '../../validators/domain-connect-redirect-url.validator';

export class CreateDomainConnectApplyUrlCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  domain: string;

  @IsOptional()
  @IsString()
  @IsDomainConnectRedirectUrl()
  redirectUri?: string;
}
