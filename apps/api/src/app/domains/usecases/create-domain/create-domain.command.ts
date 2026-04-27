import { IsFQDN, IsNotEmpty, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class CreateDomainCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  @IsFQDN({
    require_tld: true,
    allow_underscores: false,
    allow_trailing_dot: false,
    allow_numeric_tld: false,
    allow_wildcard: false,
  })
  name: string;
}
