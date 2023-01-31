import { IsDefined, MaxLength } from 'class-validator';
import { AuthenticatedCommand } from '../../../shared/commands/authenticated.command';

export class UpdateOrganizationCommand extends AuthenticatedCommand {
  @IsDefined()
  public readonly id: string;

  @MaxLength(50)
  name: string;
}
