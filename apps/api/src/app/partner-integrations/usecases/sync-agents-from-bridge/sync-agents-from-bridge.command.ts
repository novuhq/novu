import { IsBoolean, IsDefined, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class SyncAgentsFromBridgeCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  bridgeUrl: string;

  @IsBoolean()
  isProduction: boolean;
}
