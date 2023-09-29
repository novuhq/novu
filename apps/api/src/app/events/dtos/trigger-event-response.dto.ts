import { IsBoolean, IsDefined, IsString } from 'class-validator';
import { TriggerEventStatusEnum } from '@novu/shared';
import { ApiProperty } from '@nestjs/swagger';

export class TriggerEventResponseDto {
  @ApiProperty({
    description: 'If trigger was acknowledged or not',
  })
  @IsBoolean()
  @IsDefined()
  acknowledged: boolean;

  @ApiProperty({
    description: 'Status for trigger',
    enum: TriggerEventStatusEnum,
  })
  @IsDefined()
  status: TriggerEventStatusEnum;

  @ApiProperty({
    description: 'In case of an error, this field will contain the error message',
  })
  error?: string[];

  @ApiProperty({
    description: 'Transaction id for trigger',
  })
  @IsString()
  transactionId?: string;
}
