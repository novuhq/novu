import { IsDefined, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class DeleteChannelConnectionCommand extends EnvironmentCommand {
  @IsDefined()
  @IsString()
  identifier: string;

  /**
   * Restricts the delete to the connection's owner: a subscriber id deletes only that
   * subscriber's connection, `null` only a shared one. Omitted, any connection with the
   * identifier in the environment matches (admin API).
   */
  @IsOptional()
  @IsString()
  subscriberId?: string | null;
}
