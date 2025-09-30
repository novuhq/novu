import { IsDefined, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetVercelIntegrationProjectsCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsString()
  configurationId: string;

  @IsOptional()
  @IsString()
  nextPage?: string;
}
