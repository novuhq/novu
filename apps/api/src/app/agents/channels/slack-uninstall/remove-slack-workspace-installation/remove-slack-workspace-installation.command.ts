import { IsNotEmpty, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../../shared/commands/project.command';

export class RemoveSlackWorkspaceInstallationCommand extends EnvironmentCommand {
  @IsString()
  @IsNotEmpty()
  readonly integrationIdentifier: string;

  @IsString()
  @IsNotEmpty()
  readonly integrationId: string;

  /** Slack `team_id` of the workspace that removed the app. */
  @IsString()
  @IsNotEmpty()
  readonly workspaceId: string;
}
