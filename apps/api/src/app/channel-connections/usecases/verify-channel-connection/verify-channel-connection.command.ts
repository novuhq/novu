import { IsDefined, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class VerifyChannelConnectionCommand extends EnvironmentCommand {
  @IsDefined()
  @IsString()
  identifier: string;
}
