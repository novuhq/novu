import { IsNotEmpty } from 'class-validator';
import { AuthenticatedCommand } from './authenticated.command';

export abstract class OrganizationCommand extends AuthenticatedCommand {
  @IsNotEmpty()
  readonly organizationId: string;
}
