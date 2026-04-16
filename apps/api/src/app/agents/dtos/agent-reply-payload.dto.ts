import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import type { FileRef } from '@novu/framework';

export type { FileRef } from '@novu/framework';

const SIGNAL_TYPES = ['metadata', 'trigger'] as const;

@ValidatorConstraint({ name: 'isValidSignal', async: false })
export class IsValidSignal implements ValidatorConstraintInterface {
  validate(signal: SignalDto): boolean {
    if (!signal?.type) return false;

    if (signal.type === 'metadata') {
      return typeof signal.key === 'string' && signal.key.length > 0 && signal.value !== undefined;
    }

    if (signal.type === 'trigger') {
      return typeof signal.workflowId === 'string' && signal.workflowId.length > 0;
    }

    return false;
  }

  defaultMessage(): string {
    return 'metadata signals require key + value; trigger signals require workflowId.';
  }
}

@ValidatorConstraint({ name: 'isValidReplyContent', async: false })
export class IsValidReplyContent implements ValidatorConstraintInterface {
  validate(content: ReplyContentDto): boolean {
    if (!content) return true;

    const fields = [content.text, content.markdown, content.card].filter((v) => v !== undefined);
    if (fields.length !== 1) return false;

    if (content.files?.length && !content.markdown) return false;

    for (const file of content.files ?? []) {
      const sources = [file.data, file.url].filter(Boolean);
      if (sources.length !== 1) return false;
    }

    return true;
  }

  defaultMessage(): string {
    return 'Content must have exactly one of text, markdown, or card. Files only allowed with markdown. Each file needs exactly one of data or url.';
  }
}

export class ReplyContentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40_000)
  text?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  markdown?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  card?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  files?: FileRef[];
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

  @ApiPropertyOptional({ type: ReplyContentDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Validate(IsValidReplyContent)
  @Type(() => ReplyContentDto)
  reply?: ReplyContentDto;

  @ApiPropertyOptional({ type: ReplyContentDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Validate(IsValidReplyContent)
  @Type(() => ReplyContentDto)
  update?: ReplyContentDto;

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
  @Validate(IsValidSignal, { each: true })
  @Type(() => SignalDto)
  signals?: SignalDto[];
}
