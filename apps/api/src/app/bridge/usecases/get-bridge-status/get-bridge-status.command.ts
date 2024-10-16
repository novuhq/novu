import { EnvironmentLevelCommand } from '@novu/application-generic';

export class GetBridgeStatusCommand extends EnvironmentLevelCommand {
  statelessBridgeUrl?: string;
}
