import { IsDefined, IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../commands';
import { WorkflowTypeEnum } from '@novu/shared';

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
