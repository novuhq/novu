import { ApiProperty } from '@nestjs/swagger';
import { AiResourceTypeEnum } from '@novu/shared';
import { UIMessage } from 'ai';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Chat message to send to the AI',
  })
  @IsNotEmpty()
  message: UIMessage;

  @ApiProperty({
    description: 'Type of resource to determine the AI agent to use',
    enum: AiResourceTypeEnum,
    example: AiResourceTypeEnum.WORKFLOW,
  })
  @IsNotEmpty()
  @IsEnum(AiResourceTypeEnum)
  resourceType: AiResourceTypeEnum;
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
