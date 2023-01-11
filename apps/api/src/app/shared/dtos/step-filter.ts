import { BuilderFieldOperator, BuilderFieldType, BuilderGroupValues, FilterPartType } from '@novu/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class BaseFilterPart {
  on: FilterPartType;
}

class BaseFieldFilterPart extends BaseFilterPart {
  @ApiProperty()
  field: string;

  @ApiProperty()
  value: string;

  @ApiProperty({
    enum: [
      'LARGER',
      'SMALLER',
      'LARGER_EQUAL',
      'SMALLER_EQUAL',
      'EQUAL',
      'NOT_EQUAL',
      'ALL_IN',
      'ANY_IN',
      'NOT_IN',
      'BETWEEN',
      'NOT_BETWEEN',
      'LIKE',
      'NOT_LIKE',
      'IN',
    ],
  })
  operator: BuilderFieldOperator;
}

class FieldFilterPart extends BaseFieldFilterPart {
  @ApiProperty({
    enum: ['payload', 'subscriber'],
  })
  on: 'payload' | 'subscriber';
}

class WebhookFilterPart extends BaseFieldFilterPart {
  @ApiProperty({
    enum: ['webhook'],
  })
  on: 'webhook';

  @ApiPropertyOptional()
  webhookUrl: string;
}

class RealtimeOnlineFilterPart extends BaseFilterPart {
  @ApiProperty({
    enum: ['isOnline'],
  })
  on: 'isOnline';

  @ApiProperty()
  value: boolean;
}

class OnlineInLastFilterPart extends BaseFilterPart {
  @ApiProperty({
    enum: ['isOnlineInLast'],
  })
  on: 'isOnlineInLast';

  @ApiProperty({
    enum: ['minutes', 'hours', 'days'],
  })
  timeOperator: 'minutes' | 'hours' | 'days';

  @ApiProperty()
  value: number;
}

type FilterParts = FieldFilterPart | WebhookFilterPart | RealtimeOnlineFilterPart | OnlineInLastFilterPart;

export class StepFilter {
  @ApiProperty()
  isNegated: boolean;

  @ApiProperty({
    enum: ['BOOLEAN', 'TEXT', 'DATE', 'NUMBER', 'STATEMENT', 'LIST', 'MULTI_LIST', 'GROUP'],
  })
  type: BuilderFieldType;

  @ApiProperty({
    enum: ['AND', 'OR'],
  })
  value: BuilderGroupValues;

  @ApiProperty({
    type: [FieldFilterPart, WebhookFilterPart, RealtimeOnlineFilterPart, OnlineInLastFilterPart],
  })
  children: FilterParts[];
}
