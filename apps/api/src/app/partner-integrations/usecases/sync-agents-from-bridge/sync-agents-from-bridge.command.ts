import type { DiscoverOutput } from '@novu/framework/internal';
import { IsBoolean, IsDefined, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class SyncAgentsFromBridgeCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  bridgeUrl: string;

  @IsBoolean()
  isProduction: boolean;

  @IsOptional()
  discoverResult?: DiscoverOutput;
}
