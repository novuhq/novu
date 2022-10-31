import { IsString, IsDefined } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetVercelProjectsCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsString()
  configurationId: string;
}
