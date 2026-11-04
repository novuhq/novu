import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class InboundSenderAuthDto {
  @ApiPropertyOptional({
    description: 'When true, the DKIM verdict must be pass. Omit to leave the stored flag unchanged.',
  })
  @IsOptional()
  @IsBoolean()
  dkim?: boolean;

  @ApiPropertyOptional({
    description: 'When true, the SPF verdict must be pass. Omit to leave the stored flag unchanged.',
  })
  @IsOptional()
  @IsBoolean()
  spf?: boolean;
}

export class InboundSenderAuthResponseDto {
  @ApiProperty({
    description: 'When true, DKIM must be pass. False logs a non-pass verdict and does not block.',
  })
  dkim: boolean;

  @ApiProperty({
    description: 'When true, SPF must be pass. False logs a non-pass verdict and does not block.',
  })
  spf: boolean;
}
