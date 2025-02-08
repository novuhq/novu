import { ApiProperty } from '@nestjs/swagger';

export enum IdempotencyBehaviorEnum {
  IMMEDIATE_RESPONSE = 'IMMEDIATE_RESPONSE',
  IMMEDIATE_EXCEPTION = 'IMMEDIATE_EXCEPTION',
  DELAYED_RESPONSE = 'DELAYED_RESPONSE',
}

export class IdempotencyTestingDto {
  @ApiProperty({
    enum: Object.values(IdempotencyBehaviorEnum),
    description: 'The expected behavior of the idempotency request',
    enumName: 'IdempotencyBehaviorEnum',
  })
  expectedBehavior: IdempotencyBehaviorEnum;
}
export class IdempotenceTestingResponse {
  @ApiProperty({
    description: 'A unique number representing the idempotency response',
    example: 1, // Example value for better understanding
  })
  number: number;
}
