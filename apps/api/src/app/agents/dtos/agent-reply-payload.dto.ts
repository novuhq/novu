import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

const SIGNAL_TYPES = ['metadata', 'trigger'] as const;

export class TextContentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40_000)
  text: string;
}

export class ResolveDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;
}

export class SignalDto {
  @ApiProperty({ enum: SIGNAL_TYPES })
  @IsString()
  @IsIn(SIGNAL_TYPES)
  type: (typeof SIGNAL_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  key?: string;

  @ApiPropertyOptional()
  @IsOptional()
  value?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workflowId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export class AgentReplyPayloadDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  @ApiPropertyOptional({ type: TextContentDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => TextContentDto)
  reply?: TextContentDto;

  @ApiPropertyOptional({ type: TextContentDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => TextContentDto)
  update?: TextContentDto;

  @ApiPropertyOptional({ type: ResolveDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ResolveDto)
  resolve?: ResolveDto;

  @ApiPropertyOptional({ type: [SignalDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SignalDto)
  signals?: SignalDto[];
}
