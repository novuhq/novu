import { IsString, IsDefined, IsOptional } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetVercelProjectsCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsString()
  configurationId: string;

  @IsOptional()
  @IsString()
  nextPage?: string;
}
