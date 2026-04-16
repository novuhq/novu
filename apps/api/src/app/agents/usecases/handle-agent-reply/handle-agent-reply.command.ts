import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import type { Signal } from '@novu/framework';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { ReplyContentDto } from '../../dtos/agent-reply-payload.dto';

export type { Signal } from '@novu/framework';

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
  reply?: ReplyContentDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ReplyContentDto)
  update?: ReplyContentDto;

  @IsOptional()
  @IsObject()
  resolve?: { summary?: string };

  @IsOptional()
  @IsArray()
  signals?: Signal[];
}
