import { BaseCommand } from '@novu/application-generic';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** `agentinbox connect <agent> --code <code>`, as the CLI typed it. Both are tidied up before they're looked up. */
export class ConnectHostCommand extends BaseCommand {
  @IsString()
  @IsNotEmpty()
  @MaxLength(320)
  agent: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code: string;
}
