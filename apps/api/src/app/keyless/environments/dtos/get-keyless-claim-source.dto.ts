import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KEYLESS_CREATION_SOURCES, type KeylessCreationSource } from '@novu/shared';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetKeylessClaimSourceRequestDto {
  @ApiProperty({ description: 'The claim token from the claim URL. It is read, not consumed.' })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class GetKeylessClaimSourceResponseDto {
  @ApiProperty({ description: 'Who created the keyless environment', enum: KEYLESS_CREATION_SOURCES, example: 'agent' })
  source: KeylessCreationSource;

  @ApiPropertyOptional({ description: 'The agent tool that created the environment', example: 'cursor' })
  client?: string;
}
