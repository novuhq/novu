import { IsDefined, IsEnum, IsMongoId } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../commands';
import { WorkflowTypeEnum } from '@novu/shared';

export class DeleteMessageTemplateCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsMongoId()
  messageTemplateId: string;

  @IsDefined()
  @IsMongoId()
  parentChangeId: string;

  @IsEnum(WorkflowTypeEnum)
  @IsDefined()
  workflowType: WorkflowTypeEnum;
}
