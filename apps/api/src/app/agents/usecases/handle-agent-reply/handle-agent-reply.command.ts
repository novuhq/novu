import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export interface FileRef {
  filename: string;
  mimeType?: string;
  data?: string;
  url?: string;
}

@ValidatorConstraint({ name: 'isValidReplyContent', async: false })
class IsValidReplyContent implements ValidatorConstraintInterface {
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
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  markdown?: string;

  @IsOptional()
  @IsObject()
  card?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  files?: FileRef[];
}

export class HandleAgentReplyCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ReplyContentDto)
  @Validate(IsValidReplyContent)
  reply?: ReplyContentDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ReplyContentDto)
  @Validate(IsValidReplyContent)
  update?: ReplyContentDto;

  @IsOptional()
  @IsObject()
  resolve?: { summary?: string };

  @IsOptional()
  @IsArray()
  signals?: Signal[];
}

export type Signal =
  | { type: 'metadata'; key: string; value: unknown }
  | { type: 'trigger'; workflowId: string; to?: string; payload?: Record<string, unknown> };
