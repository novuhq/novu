import { ApiPropertyOptional } from '@nestjs/swagger';

export class PreferenceChannels {
  @ApiPropertyOptional()
  email?: boolean;
  @ApiPropertyOptional()
  sms?: boolean;
  @ApiPropertyOptional()
  in_app?: boolean;
  @ApiPropertyOptional()
  chat?: boolean;
  @ApiPropertyOptional()
  push?: boolean;
}
