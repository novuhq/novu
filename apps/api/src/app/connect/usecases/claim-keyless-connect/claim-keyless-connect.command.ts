import { IsNotEmpty, IsString } from 'class-validator';
import { AuthenticatedCommand } from '@novu/application-generic';

export class ClaimKeylessConnectCommand extends AuthenticatedCommand {
  @IsString()
  @IsNotEmpty()
  readonly token: string;

  @IsString()
  @IsNotEmpty()
  readonly organizationId: string;
}
