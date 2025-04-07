import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { DuplicateWorkflowDto } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsArray, IsDefined, IsOptional, IsString, ValidateNested } from 'class-validator';

export class DuplicateWorkflowDataCommand implements DuplicateWorkflowDto {
  @IsString()
  @IsDefined()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];
}

export class DuplicateWorkflowCommand extends EnvironmentWithUserObjectCommand {
  @IsString()
  @IsDefined()
  workflowIdOrInternalId: string;

  @ValidateNested()
  @Type(() => DuplicateWorkflowDataCommand)
  overrides: DuplicateWorkflowDataCommand;
}
