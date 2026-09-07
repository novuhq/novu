import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { IsDefined, IsString } from 'class-validator';

export class DiscoverVirtualWorkflowsCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsString()
  bridgeUrl: string;
}
