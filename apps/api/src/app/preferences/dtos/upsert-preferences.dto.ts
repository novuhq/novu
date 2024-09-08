import { Type } from 'class-transformer';
import { IsString, ValidateNested } from 'class-validator';
import { PreferencesDto } from './preferences.dto';

export class UpsertPreferencesDto {
  @IsString()
  workflowId: string;

  @ValidateNested({ each: true })
  @Type(() => PreferencesDto)
  preferences: PreferencesDto;
}
