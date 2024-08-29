import { Type } from 'class-transformer';
import { IsBoolean, ValidateNested } from 'class-validator';

class Preference {
  @IsBoolean()
  defaultValue: boolean;

  @IsBoolean()
  readOnly: boolean;
}

class Channels {
  @ValidateNested({ each: true })
  @Type(() => Preference)
  in_app: Preference;

  @ValidateNested({ each: true })
  @Type(() => Preference)
  email: Preference;

  @ValidateNested({ each: true })
  @Type(() => Preference)
  sms: Preference;

  @ValidateNested({ each: true })
  @Type(() => Preference)
  chat: Preference;

  @ValidateNested({ each: true })
  @Type(() => Preference)
  push: Preference;
}

export class PreferencesDto {
  @ValidateNested({ each: true })
  @Type(() => Preference)
  workflow: Preference;

  @ValidateNested({ each: true })
  @Type(() => Channels)
  channels: Channels;
}
