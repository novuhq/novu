import { IsDefined, IsNotEmpty } from 'class-validator';
import { AuthenticatedCommand } from '../../../shared/commands/authenticated.command';

export class RenameOrganizationCommand extends AuthenticatedCommand {
  @IsDefined()
  public readonly id: string;

  @IsDefined()
  @IsNotEmpty()
  name: string;
}
