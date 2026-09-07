import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { DiscoverWorkflowOutput } from '@novu/framework/internal';
import { IsArray, IsDefined } from 'class-validator';

export class BuildVirtualWorkflowsCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsArray()
  discoveredWorkflows: DiscoverWorkflowOutput[];
}
