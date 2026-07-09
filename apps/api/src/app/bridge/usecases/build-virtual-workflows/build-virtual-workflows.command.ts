import { DiscoverWorkflowOutput } from '@novu/framework/internal';
import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { IsArray, IsDefined } from 'class-validator';

export class BuildVirtualWorkflowsCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsArray()
  discoveredWorkflows: DiscoverWorkflowOutput[];
}
