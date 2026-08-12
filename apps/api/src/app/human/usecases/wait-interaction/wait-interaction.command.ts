import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class WaitInteractionCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsInt()
  @Min(1)
  @Max(30)
  timeoutSeconds: number;
}
