import { Type } from 'class-transformer';
import { IsDefined, IsMongoId, IsOptional, IsString, ValidateNested } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { AuthDto, WorkspaceDto } from '../../dtos/shared.dto';

export class UpdateChannelConnectionCommand extends EnvironmentCommand {
  @IsDefined()
  @IsString()
  identifier: string;

  /**
   * Restricts the update to this exact record, for callers that already loaded and authorized it
   * (OAuth callbacks), so a connection recreated under the same identifier in the meantime is never
   * overwritten. Omitted, any connection with the identifier in the environment matches (admin API).
   */
  @IsOptional()
  @IsMongoId()
  channelConnectionId?: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => WorkspaceDto)
  workspace: WorkspaceDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => AuthDto)
  auth: AuthDto;
}
