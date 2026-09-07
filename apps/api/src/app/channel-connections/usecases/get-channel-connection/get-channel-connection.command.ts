import { ConnectionMode } from '@novu/shared';
import { IsArray, IsDefined, IsIn, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetChannelConnectionCommand extends EnvironmentCommand {
  @IsDefined()
  @IsString()
  identifier: string;

  @IsOptional()
  @IsString()
  subscriberId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contextKeys?: string[];

  /**
   * Read-time scoping over `subscriberId` (only applied when `subscriberId` is set):
   * - `'subscriber'` matches only the subscriber's own connection;
   * - `'shared'` matches only shared connections (`subscriberId` null);
   * - omitted matches either (subscriber-owned or shared).
   */
  @IsOptional()
  @IsString()
  @IsIn(['subscriber', 'shared'])
  connectionMode?: ConnectionMode;
}
