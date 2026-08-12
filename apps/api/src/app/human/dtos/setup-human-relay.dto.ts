import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class SetupHumanRelayRequestDto {
  @ApiProperty({ description: 'subscriberId that identifies the human being set up.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  subscriberId: string;

  @ApiPropertyOptional({ description: 'Relay agent identifier. Defaults to `human-relay`.' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-_]+$/i)
  @MaxLength(64)
  agentIdentifier?: string;
}

export class SetupHumanRelayResponseDto {
  @ApiProperty()
  agentId: string;

  @ApiProperty()
  agentIdentifier: string;

  @ApiProperty()
  subscriberId: string;
}
