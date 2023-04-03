import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  StepTypeEnum,
} from '@novu/shared';

export class ExecutionDetailsResponseDto {
  @ApiPropertyOptional()
  _id?: string;

  @ApiProperty()
  _organizationId: string;

  @ApiProperty()
  _jobId: string;

  @ApiProperty()
  _environmentId: string;

  @ApiProperty()
  _notificationId: string;

  @ApiProperty()
  _notificationTemplateId: string;

  @ApiProperty()
  _subscriberId: string;

  @ApiPropertyOptional()
  _messageId?: string;

  @ApiPropertyOptional()
  providerId?: string;

  @ApiProperty()
  transactionId: string;

  @ApiProperty({
    enum: StepTypeEnum,
  })
  channel?: StepTypeEnum;

  @ApiProperty()
  detail: string;

  @ApiProperty({
    enum: ExecutionDetailsSourceEnum,
  })
  source: ExecutionDetailsSourceEnum;

  @ApiProperty({
    enum: ExecutionDetailsStatusEnum,
  })
  status: ExecutionDetailsStatusEnum;

  @ApiProperty({
    type: Boolean,
  })
  isTest: boolean;

  @ApiProperty({
    type: Boolean,
  })
  isRetry: boolean;

  @ApiPropertyOptional()
  createdAt?: string;
}
