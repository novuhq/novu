import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExecutionDetailsStatusEnum, StepTypeEnum } from '@novu/shared';

class ActivityNotificationExecutionDetailResponseDto {
  @ApiProperty({
    enum: StepTypeEnum,
  })
  status: ExecutionDetailsStatusEnum;

  @ApiProperty()
  detail: string;

  @ApiPropertyOptional()
  raw?: string;
}

class ActivityNotificationJobResponseDto {
  @ApiProperty()
  type: string;
  @ApiPropertyOptional()
  providerId?: string;
  @ApiProperty()
  executionDetails: ActivityNotificationExecutionDetailResponseDto[];
}
class ActivityNotificationSubscriberResponseDto {
  @ApiPropertyOptional()
  firstName?: string;
  @ApiProperty()
  _id: string;
  @ApiPropertyOptional()
  lastName?: string;
  @ApiPropertyOptional()
  email?: string;
}

class ActivityNotificationTemplateResponseDto {
  @ApiPropertyOptional()
  _id?: string;
  @ApiProperty()
  name: string;
}

export class ActivityNotificationResponseDto {
  @ApiPropertyOptional()
  _id?: string;

  @ApiProperty()
  _templateId: string;

  @ApiProperty()
  _environmentId: string;

  @ApiProperty()
  _organizationId: string;

  @ApiProperty()
  _subscriberId: string;

  @ApiProperty()
  transactionId: string;

  @ApiPropertyOptional()
  createdAt?: Date;

  @ApiPropertyOptional({
    enum: StepTypeEnum,
  })
  channels?: StepTypeEnum[];

  @ApiPropertyOptional()
  subscriber?: ActivityNotificationSubscriberResponseDto;

  @ApiPropertyOptional()
  template?: ActivityNotificationTemplateResponseDto;

  @ApiPropertyOptional()
  jobs?: ActivityNotificationJobResponseDto[];
}

export class ActivitiesResponseDto {
  @ApiProperty()
  totalCount: number;

  @ApiProperty()
  data: ActivityNotificationResponseDto[];

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  page: number;
}
