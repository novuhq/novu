import { ApiExtraModels, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActorTypeEnum, ChannelTypeEnum, IActor, INotificationDto } from '@novu/shared';

import { SubscriberResponseDto } from '../../subscribers/dtos';
import { EmailBlock, MessageCTA } from './message-response.dto';

class Actor implements IActor {
  @ApiProperty()
  data: string | null;

  @ApiProperty({ enum: ActorTypeEnum })
  type: ActorTypeEnum;
}

@ApiExtraModels(EmailBlock, MessageCTA)
export class NotificationDto implements INotificationDto {
  @ApiPropertyOptional()
  _id: string;

  @ApiProperty()
  _templateId: string;

  @ApiProperty()
  _environmentId: string;

  @ApiProperty()
  _messageTemplateId: string;

  @ApiProperty()
  _organizationId: string;

  @ApiProperty()
  _notificationId: string;

  @ApiProperty()
  _subscriberId: string;

  @ApiProperty()
  _feedId: string;

  @ApiProperty()
  _jobId: string;

  @ApiPropertyOptional()
  createdAt: string;

  @ApiPropertyOptional()
  updatedAt: string;

  @ApiPropertyOptional()
  expireAt: string;

  @ApiPropertyOptional({
    type: Actor,
  })
  actor?: Actor;

  @ApiPropertyOptional({
    type: SubscriberResponseDto,
  })
  subscriber?: SubscriberResponseDto;

  @ApiProperty()
  transactionId: string;

  @ApiPropertyOptional()
  templateIdentifier: string;

  @ApiPropertyOptional()
  providerId: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  subject?: string;

  @ApiProperty({
    enum: ChannelTypeEnum,
  })
  channel: ChannelTypeEnum;

  @ApiProperty()
  read: boolean;

  @ApiProperty()
  seen: boolean;

  @ApiProperty()
  deleted: boolean;

  @ApiPropertyOptional()
  deviceTokens?: string[];

  @ApiProperty({
    type: MessageCTA,
  })
  cta: MessageCTA;

  @ApiProperty({
    enum: ['sent', 'error', 'warning'],
  })
  status: 'sent' | 'error' | 'warning';

  @ApiProperty({
    description: 'The payload that was used to send the notification trigger',
  })
  payload: Record<string, unknown>;

  @ApiProperty({
    description: 'Provider specific overrides used when triggering the notification',
  })
  overrides: Record<string, unknown>;
}

export class FeedResponseDto {
  @ApiPropertyOptional()
  totalCount?: number;

  @ApiProperty()
  hasMore: boolean;

  @ApiProperty()
  data: NotificationDto[];

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  page: number;
}
