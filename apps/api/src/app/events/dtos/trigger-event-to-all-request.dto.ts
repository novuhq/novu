import { IsDefined, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TriggerEventToAllRequestDto {
  @ApiProperty({
    description: 'Name of your notification',
  })
  @IsString()
  @IsDefined()
  name: string;

  @ApiProperty({
    description: 'payload with data to be used inside of message templates',
  })
  @IsObject()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @ApiProperty({
    description: 'Overrides for push notification settings',
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
