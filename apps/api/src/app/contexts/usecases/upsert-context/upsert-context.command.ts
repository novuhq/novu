import { EnvironmentCommand, IsValidContextPayload } from '@novu/application-generic';
import { ContextPayload } from '@novu/shared';
import { IsDefined } from 'class-validator';

export class UpsertContextCommand extends EnvironmentCommand {
  @IsDefined()
  @IsValidContextPayload({ maxCount: 10 })
  context: ContextPayload;
}
