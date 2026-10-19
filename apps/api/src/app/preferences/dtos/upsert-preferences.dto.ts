import { Type } from 'class-transformer';
import { IsString, ValidateNested } from 'class-validator';
import { PreferencesDto } from './preferences.dto';

/**
 * @deprecated This DTO is no longer recommended for use.
 * Consider using an alternative implementation or updated data transfer object.
 */
export class UpsertPreferencesDto {
  /**
   * @deprecated Use an alternative workflow identification method.
   */
  @IsString()
  workflowId: string;

  /**
   * @deprecated Preferences structure is outdated.
   */
  @ValidateNested({ each: true })
  @Type(() => PreferencesDto)
  preferences: PreferencesDto;
}
