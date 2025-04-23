import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class SubscriberPreferenceChannels {
  @ApiPropertyOptional({
    type: Boolean,
    description: 'Email channel preference',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  email?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'SMS channel preference',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  sms?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'In-app channel preference',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  in_app?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Chat channel preference',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  chat?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Push notification channel preference',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  push?: boolean;
}
