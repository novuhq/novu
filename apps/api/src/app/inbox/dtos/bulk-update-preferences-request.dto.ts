import { Type } from 'class-transformer';
import { IsArray, IsDefined, IsString, ValidateNested } from 'class-validator';

import { UpdatePreferencesRequestDto } from './update-preferences-request.dto';

export class BulkUpdatePreferenceItemDto extends UpdatePreferencesRequestDto {
  @IsDefined()
  @IsString()
  readonly workflowId: string;
}

export class BulkUpdatePreferencesRequestDto {
  @IsDefined()
  @IsArray()
  @Type(() => BulkUpdatePreferenceItemDto)
  @ValidateNested({ each: true })
  readonly preferences: BulkUpdatePreferenceItemDto[];
}
