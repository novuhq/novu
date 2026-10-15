import { AuthenticatedCommand } from '@novu/application-generic';
import { IsNotEmpty, IsString } from 'class-validator';

export class ClaimKeylessConnectCommand extends AuthenticatedCommand {
  @IsString()
  @IsNotEmpty()
  readonly token: string;

  @IsString()
  @IsNotEmpty()
  readonly organizationId: string;
}
