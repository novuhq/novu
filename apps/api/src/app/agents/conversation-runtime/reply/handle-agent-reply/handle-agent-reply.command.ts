import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import type { Signal, ToolResult } from '@novu/framework/internal';
import type { PlanModel } from 'chat';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../../shared/commands/project.command';
import {
  AddReactionPayloadDto,
  DeleteMessagePayloadDto,
  EditPayloadDto,
  ReplyContentDto,
  ToolApprovalRequestPayloadDto,
} from '../../../shared/dtos/agent-reply-payload.dto';
import type { PlanPhase } from '../../egress/plan-phase';
import type { SlackNativeDelivery } from '../../egress/slack-native-delivery';

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
  @IsString()
  activityIdentifier?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ToolApprovalRequestPayloadDto)
  toolApprovalRequest?: ToolApprovalRequestPayloadDto;

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
  toolResults?: ToolResult[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddReactionPayloadDto)
  addReactions?: AddReactionPayloadDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeleteMessagePayloadDto)
  deleteMessages?: DeleteMessagePayloadDto[];

  @IsOptional()
  @IsObject()
  plan?: { model: PlanModel; phase: PlanPhase; messageId?: string };

  @IsOptional()
  typing?: { status?: string } | 'stop';

  @IsOptional()
  slackNative?: SlackNativeDelivery;

  /**
   * Marks a reply as system-generated (e.g. an error notice emitted by the
   * managed runtime). System replies are still delivered, but they do not
   * count an active conversation and bypass the free-tier outbound gate so an
   * error message is never swallowed by a 402.
   */
  @IsOptional()
  @IsBoolean()
  isSystemGenerated?: boolean;

  @IsOptional()
  @IsBoolean()
  error?: boolean;

  /** Source runtime envelope for web-chat live identity (runId/turnId). */
  @IsOptional()
  @IsObject()
  sourceEnvelope?: AgentEventEnvelope;
}
