import { IsString, IsOptional } from 'class-validator';
import { OrganizationCommand } from '../../../shared/commands/organization.command';
import { CustomDataType } from '@novu/shared';
export class ResendInviteCommand extends OrganizationCommand {
  @IsString()
  readonly memberId: string;
  @IsOptional()
  config?: CustomDataType;
}
