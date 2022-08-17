import { IsBoolean, IsDefined, IsString } from 'class-validator';
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
    enum: ['processed', 'trigger_not_active', 'template_not_found', 'subscriber_id_missing'],
  })
  @IsString()
  @IsDefined()
  status: string;

  @ApiProperty({
    description: 'Transaction id for trigger',
  })
  @IsString()
  transactionId?: string;
}
