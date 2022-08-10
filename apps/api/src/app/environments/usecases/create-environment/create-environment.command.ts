import { IsDefined, IsMongoId, IsOptional } from 'class-validator';
import { OrganizationCommand } from '../../../shared/commands/organization.command';

export class CreateEnvironmentCommand extends OrganizationCommand {
  @IsDefined()
  name: string;

  @IsOptional()
  @IsMongoId()
  parentEnvironmentId?: string;
}
