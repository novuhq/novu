import { DigestUnitEnum, DigestTypeEnum, DelayTypeEnum } from '@novu/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { MessageTemplate } from './message-template';
import { StepFilter } from './step-filter';

class NotificationStepMetadata {
  @ApiPropertyOptional()
  amount?: number;

  @ApiPropertyOptional({
    enum: DigestUnitEnum,
  })
  unit?: DigestUnitEnum;

  @ApiPropertyOptional()
  digestKey?: string;

  @ApiPropertyOptional()
  delayPath?: string;

  @ApiProperty({
    enum: { ...DigestTypeEnum, ...DelayTypeEnum },
  })
  type: DigestTypeEnum | DelayTypeEnum;

  @ApiPropertyOptional({
    enum: DigestUnitEnum,
  })
  backoffUnit?: DigestUnitEnum;

  @ApiPropertyOptional()
  backoffAmount?: number;

  @ApiPropertyOptional()
  updateMode?: boolean;
}

export class NotificationStep {
  @ApiPropertyOptional()
  _id?: string;

  @ApiPropertyOptional()
  uuid?: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  @ApiProperty()
  _templateId?: string;

  @ApiPropertyOptional()
  active?: boolean;

  @ApiPropertyOptional()
  shouldStopOnFail?: boolean;

  @ApiPropertyOptional({
    type: MessageTemplate,
  })
  template?: MessageTemplate;

  @ApiPropertyOptional({
    type: [StepFilter],
  })
  filters?: StepFilter[];

  @ApiPropertyOptional()
  _parentId?: string | null;

  @ApiPropertyOptional({
    type: NotificationStepMetadata,
  })
  metadata?: NotificationStepMetadata;

  @ApiPropertyOptional()
  replyCallback?: {
    active: boolean;
    url: string;
  };
}
