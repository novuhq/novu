import { IsNumber, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

/**
 * DEPRECATED:
 * This command is deprecated and will be removed in the future.
 * Please use the GetWorkflowsCommand instead.
 */
export class GetNotificationTemplatesCommand extends EnvironmentWithUserCommand {
  @IsNumber()
  page: number;

  @IsNumber()
  limit: number;

  @IsOptional()
  @IsString()
  query?: string;
}
