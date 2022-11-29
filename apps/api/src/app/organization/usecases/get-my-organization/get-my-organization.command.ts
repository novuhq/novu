import { IsDefined } from 'class-validator';
import { AuthenticatedCommand } from '../../../shared/commands/authenticated.command';

export class GetMyOrganizationCommand extends AuthenticatedCommand {
  @IsDefined()
  public readonly id: string;
}
