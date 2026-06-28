import { BaseCommand } from '@novu/application-generic';
import { IsArray, IsDefined, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendDocsMessageCommand extends BaseCommand {
  @IsDefined()
  @IsString()
  fp: string;

  @IsOptional()
  @IsString()
  threadId?: string;

  @IsOptional()
  @IsString()
  threadKey?: string;

  @IsDefined()
  @IsArray()
  messages: unknown[];

  @IsOptional()
  @IsNumber()
  retrievalPageSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  currentPath?: string;

  @IsDefined()
  @IsString()
  userId: string;
}
