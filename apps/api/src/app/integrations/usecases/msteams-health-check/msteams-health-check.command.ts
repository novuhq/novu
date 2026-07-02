import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class MsTeamsHealthCheckCommand extends EnvironmentCommand {
  @IsNotEmpty()
  @IsString()
  readonly integrationId: string;

  /**
   * Optional list of check names to run. When provided, only the listed checks execute;
   * the rest are returned as `null` ("not requested").
   * When omitted, all checks run (backward-compatible).
   *
   * Valid values: 'appRegistration' | 'azureBotCreated' | 'teamsAppCatalog' | 'permissions'
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly checks?: string[];
}
