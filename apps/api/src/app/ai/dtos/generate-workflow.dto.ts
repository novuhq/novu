import { ApiProperty } from '@nestjs/swagger';
import { AiConversationStatusEnum, AiMessageRoleEnum } from '@novu/shared';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { WorkflowResponseDto } from '../../workflows-v2/dtos';

export enum WorkflowSuggestionType {
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password-reset',
  ORDER_CONFIRMATION = 'order-confirmation',
  MARKETING = 'marketing',
  REAL_TIME_ALERT = 'real-time-alert',
  DIGEST = 'digest',
  CUSTOM = 'custom',
}

export class GenerateWorkflowDto {
  @ApiProperty({
    description: 'Natural language description of the workflow to generate',
    example: 'Create a welcome email workflow that sends a personalized greeting to new users',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  prompt: string;
}

export class ChannelRecommendationDto {
  @ApiProperty({ description: 'Channel type', example: 'email' })
  channel: string;

  @ApiProperty({ description: 'Reason for recommending this channel' })
  reason: string;

  @ApiProperty({ description: 'Priority of the channel in the workflow' })
  priority: number;
}

export class WorkflowReasoningDto {
  @ApiProperty({ description: 'Summary of the AI reasoning for this workflow design' })
  summary: string;

  @ApiProperty({
    description: 'List of recommended channels with reasoning',
    type: [ChannelRecommendationDto],
  })
  channelRecommendations: ChannelRecommendationDto[];

  @ApiProperty({ description: 'Best practices applied to this workflow' })
  bestPractices: string[];
}

export class AiMessageDto {
  @ApiProperty({ description: 'Message role', enum: AiMessageRoleEnum })
  role: AiMessageRoleEnum;

  @ApiProperty({ description: 'Message content' })
  content: string;

  @ApiProperty({ description: 'Message timestamp' })
  timestamp: Date;
}

export class AiConversationDto {
  @ApiProperty({ description: 'Conversation messages', type: [AiMessageDto] })
  messages: AiMessageDto[];

  @ApiProperty({ description: 'Conversation status', enum: AiConversationStatusEnum })
  status: AiConversationStatusEnum;

  @ApiProperty({ description: 'Generated workflow configuration', type: WorkflowResponseDto })
  workflow: WorkflowResponseDto;

  @ApiProperty({ description: 'AI reasoning for the workflow design', type: WorkflowReasoningDto })
  reasoning: WorkflowReasoningDto;
}
