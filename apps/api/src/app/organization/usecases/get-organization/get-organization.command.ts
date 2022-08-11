import { AuthenticatedCommand } from '../../../shared/commands/authenticated.command';

export class GetOrganizationCommand extends AuthenticatedCommand {
  public readonly id: string;
}
