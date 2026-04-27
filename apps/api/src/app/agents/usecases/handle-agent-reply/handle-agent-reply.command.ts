import type { Signal } from '@novu/framework';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { AddReactionPayloadDto, EditPayloadDto, ReplyContentDto } from '../../dtos/agent-reply-payload.dto';

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
  @Type(() => EditPayloadDto)
  edit?: EditPayloadDto;

  @IsOptional()
  @IsObject()
  resolve?: { summary?: string };

  @IsOptional()
  @IsArray()
  signals?: Signal[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddReactionPayloadDto)
  addReactions?: AddReactionPayloadDto[];
}
