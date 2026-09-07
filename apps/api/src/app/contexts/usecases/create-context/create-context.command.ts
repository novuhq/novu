import { EnvironmentWithUserCommand, IsValidContextData } from '@novu/application-generic';
import { ContextData, ContextId, ContextType } from '@novu/shared';
import { IsDefined, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateContextCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsString()
  type: ContextType;

  @IsDefined()
  @IsString()
  id: ContextId;

  @IsOptional()
  @IsValidContextData()
  data?: ContextData;

  @IsOptional()
  @IsUrl({ require_tld: false })
  bridgeUrl?: string;
}
