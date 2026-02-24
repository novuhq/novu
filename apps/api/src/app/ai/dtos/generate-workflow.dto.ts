import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiAgentTypeEnum, AiResourceTypeEnum } from '@novu/shared';
import { UIMessage } from 'ai';
import { IsDefined, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum WorkflowSuggestionType {
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password-reset',
  ORDER_CONFIRMATION = 'order-confirmation',
  MARKETING = 'marketing',
  REAL_TIME_ALERT = 'real-time-alert',
  DIGEST = 'digest',
  CUSTOM = 'custom',
}

export class StreamGenerationDto {
  @ApiProperty({ description: 'Chat ID' })
  @IsDefined()
  @IsMongoId()
  id: string;

  @ApiPropertyOptional({
    description: 'Chat message to send to the AI, if not provided, the chat will be resumed',
  })
  @IsOptional()
  message?: UIMessage | null;

  @ApiProperty({
    description: 'Type of agent to use for streaming',
    enum: AiAgentTypeEnum,
    example: AiAgentTypeEnum.GENERATE_WORKFLOW,
  })
  @IsNotEmpty()
  @IsEnum(AiAgentTypeEnum)
  agentType: AiAgentTypeEnum;
}

export class CancelStreamDto {
  @ApiProperty({ description: 'Chat ID' })
  @IsDefined()
  @IsMongoId()
  chatId: string;
}

export class SnapshotActionDto {
  @ApiProperty({ description: 'Chat ID' })
  @IsDefined()
  @IsMongoId()
  chatId: string;

  @ApiProperty({ description: 'User message ID that triggered the generation' })
  @IsString()
  @IsDefined()
  messageId: string;
}

export class CreateChatDto {
  @ApiProperty({
    description: 'Type of resource to create a chat for',
    enum: AiResourceTypeEnum,
    example: AiResourceTypeEnum.WORKFLOW,
  })
  @IsNotEmpty()
  @IsEnum(AiResourceTypeEnum)
  resourceType: AiResourceTypeEnum;

  @ApiProperty({ description: 'Resource ID to create a chat for' })
  @IsString()
  @IsOptional()
  resourceId?: string;
}
