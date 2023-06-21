import { IsDefined, IsMongoId } from 'class-validator';
import { OrganizationCommand } from '../../../shared/commands/organization.command';

export class GetMyEnvironmentsCommand extends OrganizationCommand {
  @IsDefined()
  @IsMongoId()
  environmentId: string;
}
