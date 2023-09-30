import { IsMongoId, IsString } from 'class-validator';
import { OrganizationCommand } from '../../../../shared/commands/organization.command';

export class RemoveMemberCommand extends OrganizationCommand {
  @IsString()
  @IsMongoId()
  memberId: string;
}
