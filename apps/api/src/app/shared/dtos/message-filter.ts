import { IsArray } from 'class-validator';
import { BuilderFieldOperator, BuilderFieldType, BuilderGroupValues } from '@novu/shared';
import { ApiProperty } from '@nestjs/swagger';

class MessageFilterChild {
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

  @ApiProperty({
    enum: ['payload', 'subscriber'],
  })
  on?: 'payload' | 'subscriber';
}

export class MessageFilter {
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
    type: [MessageFilterChild],
  })
  @IsArray()
  children: MessageFilterChild[];
}
