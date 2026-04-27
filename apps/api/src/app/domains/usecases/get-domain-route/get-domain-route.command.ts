import { IsNotEmpty, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetDomainRouteCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  domainId: string;

  @IsString()
  @IsNotEmpty()
  routeId: string;
}
