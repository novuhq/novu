import { IsDefined, IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { WorkflowTypeEnum } from '@novu/shared';
import { EnvironmentWithUserCommand } from '../../../commands';

export class DeleteMessageTemplateCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsMongoId()
  messageTemplateId: string;

  @IsOptional()
  @IsMongoId()
  parentChangeId?: string;

  @IsEnum(WorkflowTypeEnum)
  @IsDefined()
  workflowType: WorkflowTypeEnum;
}
