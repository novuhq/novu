import { IsBoolean, IsDefined, IsMongoId } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

/**
 * DEPRECATED:
 * This command is deprecated and will be removed in the future.
 * Please use the ChangeWorkflowActiveStatusCommand instead.
 */
export class ChangeTemplateActiveStatusCommand extends EnvironmentWithUserCommand {
  @IsBoolean()
  @IsDefined()
  active: boolean;

  @IsMongoId()
  @IsDefined()
  templateId: string;
}
