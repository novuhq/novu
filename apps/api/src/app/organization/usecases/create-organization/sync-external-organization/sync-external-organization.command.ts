import { IsString, IsDefined, IsEnum, IsOptional } from 'class-validator';
import { AuthenticatedCommand } from '@novu/application-generic';

export class SyncExternalOrganizationCommand extends AuthenticatedCommand {
  @IsDefined()
  @IsString()
  externalId: string;
}
