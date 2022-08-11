import { IsDefined, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TriggerEventToAllRequestDto {
  @ApiProperty({
    description: 'Trigger identifire of your notification',
  })
  @IsString()
  @IsDefined()
  name: string;

  @ApiProperty({
    description: 'payload with data to be used inside of message templates',
    example: {
      name: 'Novu',
    },
  })
  @IsObject()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @ApiPropertyOptional({
    description: 'Overrides for push notification settings',
    example: {
      fcm: {
        color: '#fff',
      },
    },
  })
  @IsObject()
  @IsOptional()
  overrides: Record<string, Record<string, unknown>>;

  @ApiProperty({
    description: 'Id to use to keep track of trigger',
  })
  @IsString()
  @IsOptional()
  transactionId: string;
}
