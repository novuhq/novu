import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateSubscriberTokensSettingRequestDto {
  @ApiProperty({ type: Boolean, description: 'Require a signed subscriber token for every subscriber session' })
  @IsBoolean()
  required: boolean;
}

export class SubscriberTokensSettingResponseDto {
  @ApiProperty({ type: Boolean })
  required: boolean;

  @ApiPropertyOptional({ type: Date, description: 'When the environment started requiring signed subscriber tokens' })
  requiredAt?: Date;
}

export class SubscriberTokensSettingsDto {
  @ApiProperty({ type: Date, description: 'When the environment started requiring signed subscriber tokens' })
  requiredAt: Date;
}
