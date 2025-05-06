import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { Type } from 'class-transformer';
import { IsDefined, IsString, ValidateNested } from 'class-validator';
import { DuplicateWorkflowDto } from '../../dtos/duplicate-workflow.dto';

export class DuplicateWorkflowCommand extends EnvironmentWithUserObjectCommand {
  @IsString()
  @IsDefined()
  workflowIdOrInternalId: string;

  @ValidateNested()
  @Type(() => DuplicateWorkflowDto)
  overrides: DuplicateWorkflowDto;
}
