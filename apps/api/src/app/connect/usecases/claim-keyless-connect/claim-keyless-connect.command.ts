import { AuthenticatedCommand } from '@novu/application-generic';
import { KEYLESS_CREATION_SOURCES, type KeylessCreationSource } from '@novu/shared';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ClaimKeylessConnectCommand extends AuthenticatedCommand {
  @IsString()
  @IsNotEmpty()
  readonly token: string;

  @IsString()
  @IsNotEmpty()
  readonly organizationId: string;

  /**
   * Who created the setup, for claim flows that know it better than the stored creation source:
   * Human setups start as an inbox keyless session, so only the Human claim can tell them apart.
   */
  @IsOptional()
  @IsIn(KEYLESS_CREATION_SOURCES)
  readonly source?: KeylessCreationSource;
}
