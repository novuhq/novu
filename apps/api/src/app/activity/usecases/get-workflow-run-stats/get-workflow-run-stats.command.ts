import { IsEnum, IsOptional } from 'class-validator';
import { WorkflowRunStatsGroupByEnum } from '../../dtos/shared.dto';
import { WorkflowRunFiltersCommand } from '../get-workflow-runs/get-workflow-runs.command';

export class GetWorkflowRunStatsCommand extends WorkflowRunFiltersCommand {
  @IsOptional()
  @IsEnum(WorkflowRunStatsGroupByEnum)
  groupBy?: WorkflowRunStatsGroupByEnum;
}
