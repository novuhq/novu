import { AuthenticatedCommand } from '@novu/application-generic';
import { IsDefined, IsEnum, IsOptional, IsString } from 'class-validator';

export class SyncExternalOrganizationCommand extends AuthenticatedCommand {
  @IsDefined()
  @IsString()
  externalId: string;
}
