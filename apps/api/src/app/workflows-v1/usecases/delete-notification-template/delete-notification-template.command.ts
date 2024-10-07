import { IsDefined, IsEnum, IsMongoId } from 'class-validator';
import { WorkflowTypeEnum } from '@novu/shared';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

/**
 * @deprecated
 * This command is deprecated and will be removed in the future.
 * Please use the GetWorkflowCommand instead.
 */
export class DeleteNotificationTemplateCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsMongoId()
  templateId: string;

  @IsEnum(WorkflowTypeEnum)
  @IsDefined()
  type: WorkflowTypeEnum;
}
