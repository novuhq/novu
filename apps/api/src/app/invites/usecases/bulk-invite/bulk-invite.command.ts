import { MemberRoleEnum, CustomDataType } from '@novu/shared';
import { OrganizationCommand } from '../../../shared/commands/organization.command';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
export class BulkInviteCommand extends OrganizationCommand {
  invitees: {
    email: string;
    role?: MemberRoleEnum;
  }[];
  @IsOptional()
  config?: CustomDataType;
}
