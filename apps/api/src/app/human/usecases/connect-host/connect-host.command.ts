import { BaseCommand } from '@novu/application-generic';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

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

  /** The network the request came from: wrong codes are counted per network, see `HumanConnectCodeService`. */
  @IsOptional()
  @IsString()
  clientIp?: string;
}
