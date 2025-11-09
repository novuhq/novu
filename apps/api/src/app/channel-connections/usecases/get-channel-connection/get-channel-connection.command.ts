import { IsDefined, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetChannelConnectionCommand extends EnvironmentCommand {
  @IsDefined()
  @IsString()
  identifier: string;
}
