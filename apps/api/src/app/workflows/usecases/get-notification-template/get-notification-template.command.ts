import { IsDefined, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

/**
 * DEPRECATED:
 * This command is deprecated and will be removed in the future.
 * Please use the GetWorkflowCommand instead.
 */
export class GetNotificationTemplateCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsString()
  workflowIdOrIdentifier: string;
}
