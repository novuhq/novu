import { IsBoolean, IsDefined, IsMongoId, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class DeleteChannelConnectionCommand extends EnvironmentCommand {
  @IsDefined()
  @IsString()
  identifier: string;

  /**
   * Restricts the delete to this exact record, for callers that already loaded and
   * authorized it (Inbox), so a connection recreated under the same identifier in the
   * meantime is never deleted. Omitted, any connection with the identifier in the
   * environment matches (admin API).
   */
  @IsOptional()
  @IsMongoId()
  channelConnectionId?: string;

  /** `false` when the caller may not delete a shared connection (Inbox session without the scope). Omitted means allowed. */
  @IsOptional()
  @IsBoolean()
  canManageSharedConnections?: boolean;
}
