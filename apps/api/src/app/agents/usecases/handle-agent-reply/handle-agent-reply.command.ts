import { BaseCommand } from '@novu/application-generic';
import { IsArray, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class HandleAgentReplyCommand extends BaseCommand {
  @IsString()
  @IsNotEmpty()
  replyToken: string;

  @IsOptional()
  @IsObject()
  reply?: { text: string };

  @IsOptional()
  @IsObject()
  update?: { text: string };

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
