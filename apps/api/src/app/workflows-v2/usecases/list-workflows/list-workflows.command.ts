import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { IsDefined } from 'class-validator';

export class ListWorkflowsCommand extends EnvironmentWithUserObjectCommand {
  searchQuery?: string;
  @IsDefined()
  offset?: number;
  @IsDefined()
  limit?: number;
}
