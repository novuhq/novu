import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class SetContactListenToCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  subscriberId: string;

  @IsBoolean()
  listenTo: boolean;

  @IsOptional()
  @IsString()
  agentIdentifier?: string;
}
