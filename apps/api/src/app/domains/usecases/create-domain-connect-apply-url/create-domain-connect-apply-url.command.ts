import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class CreateDomainConnectApplyUrlCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  domainId: string;

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false, require_protocol: true })
  redirectUri?: string;
}
