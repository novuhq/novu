import { EnvironmentWithUserCommand, IsValidContextData } from '@novu/application-generic';
import { ContextData, ContextId, ContextType } from '@novu/shared';
import { IsDefined, IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator';

export class UpdateContextCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsString()
  type: ContextType;

  @IsDefined()
  @IsString()
  id: ContextId;

  @IsDefined()
  @IsValidContextData()
  data: ContextData;

  // `null` explicitly clears the override; `undefined` leaves it untouched.
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUrl({ require_tld: false })
  bridgeUrl?: string | null;
}
