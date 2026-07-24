import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../../shared/commands/project.command';

export class DeleteAgentCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  identifier: string;

  /**
   * When true, also delete the agent from the provider cloud (e.g. Anthropic).
   * Only relevant for managed-runtime agents. Defaults to false.
   */
  @IsBoolean()
  @IsOptional()
  deleteFromProvider?: boolean;
}
