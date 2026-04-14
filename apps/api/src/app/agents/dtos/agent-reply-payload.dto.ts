import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

const SIGNAL_TYPES = ['metadata', 'trigger', 'resolve'] as const;

class ReplyContentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40_000)
  text: string;
}

class UpdateContentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40_000)
  text: string;
}

class SignalDto {
  @ApiProperty({ enum: SIGNAL_TYPES })
  @IsString()
  @IsIn(SIGNAL_TYPES)
  type: (typeof SIGNAL_TYPES)[number];
}

export class AgentReplyPayloadDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  replyToken: string;

  @ApiPropertyOptional({ type: ReplyContentDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ReplyContentDto)
  reply?: ReplyContentDto;

  @ApiPropertyOptional({ type: UpdateContentDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateContentDto)
  update?: UpdateContentDto;

  @ApiPropertyOptional({ type: [SignalDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SignalDto)
  signals?: SignalDto[];
}
