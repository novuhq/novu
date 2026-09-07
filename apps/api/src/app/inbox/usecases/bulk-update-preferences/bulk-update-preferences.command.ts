// apps/api/src/app/inbox/usecases/bulk-update-preferences/bulk-update-preferences.command.ts

import { IsValidContextPayload } from '@novu/application-generic';
import { ContextPayload } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsArray, IsDefined, IsOptional } from 'class-validator';

import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { BulkUpdatePreferenceItemDto } from '../../dtos/bulk-update-preferences-request.dto';

export class BulkUpdatePreferencesCommand extends EnvironmentWithSubscriber {
  @IsDefined()
  @IsArray()
  @Type(() => BulkUpdatePreferenceItemDto)
  readonly preferences: BulkUpdatePreferenceItemDto[];

  @IsOptional()
  @IsValidContextPayload({ maxCount: 5 })
  readonly context?: ContextPayload;
}
