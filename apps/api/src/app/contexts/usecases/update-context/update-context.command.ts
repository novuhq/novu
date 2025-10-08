import { EnvironmentWithUserCommand, IsValidContextData } from '@novu/application-generic';
import { ContextData, ContextId, ContextType } from '@novu/shared';
import { IsDefined, IsString } from 'class-validator';

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
}
