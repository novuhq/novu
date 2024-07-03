import { IsNotEmpty } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetMyEnvironmentsCommand extends EnvironmentWithUserCommand {
  @IsNotEmpty()
  readonly includeApiKeys: boolean;
}
