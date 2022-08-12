import {
  BuilderFieldOperator,
  BuilderFieldType,
  BuilderGroupValues,
  DigestUnitEnum,
  DigestTypeEnum,
} from '@novu/shared';
import { MessageTemplate } from './message-template';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class NotificationStepMetadata {
  @ApiPropertyOptional()
  amount?: number;

  @ApiPropertyOptional({
    enum: DigestUnitEnum,
  })
  unit?: DigestUnitEnum;

  @ApiPropertyOptional()
  digestKey?: string;

  @ApiProperty({
    enum: DigestTypeEnum,
  })
  type: DigestTypeEnum;

  @ApiPropertyOptional({
    enum: DigestUnitEnum,
  })
  backoffUnit?: DigestUnitEnum;

  @ApiPropertyOptional()
  backoffAmount?: number;

  @ApiPropertyOptional()
  updateMode?: boolean;
}

class StepFilterChild {
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
    ],
  })
  operator: BuilderFieldOperator;
}

class StepFilter {
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
    type: [StepFilterChild],
  })
  children: StepFilterChild[];
}

export class NotificationStep {
  @ApiPropertyOptional()
  _id?: string;

  @ApiPropertyOptional()
  @ApiProperty()
  _templateId?: string;

  @ApiPropertyOptional()
  active?: boolean;

  @ApiPropertyOptional({
    type: MessageTemplate,
  })
  template?: MessageTemplate;

  @ApiPropertyOptional({
    type: [StepFilter],
  })
  filters?: StepFilter[];

  @ApiPropertyOptional()
  _parentId?: string;

  @ApiPropertyOptional({
    type: NotificationStepMetadata,
  })
  metadata?: NotificationStepMetadata;
}
