import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../shared/commands/project.command';

/** Addresses one Human inbox thread by its conversation identifier. */
export class InboxThreadCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsOptional()
  @IsString()
  agentIdentifier?: string;
}
