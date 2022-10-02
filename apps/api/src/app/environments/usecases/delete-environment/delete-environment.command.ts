import { IsDefined, IsMongoId } from 'class-validator';
import { OrganizationCommand } from '../../../shared/commands/organization.command';

export class DeleteEnvironmentCommand extends OrganizationCommand {
  @IsDefined()
  @IsMongoId()
  _id: string;
}
