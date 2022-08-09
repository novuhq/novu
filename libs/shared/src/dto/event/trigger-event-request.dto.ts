import { IsDefined, IsObject, IsOptional, IsString } from 'class-validator';
import { TriggerRecipientsType } from '../../interfaces';
import { ApiProperty } from '@nestjs/swagger';

export class TriggerEventRequestDto {
  @ApiProperty()
  @IsString()
  @IsDefined()
  name: string;

  @ApiProperty()
  @IsObject()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @ApiProperty()
  @IsObject()
  @IsOptional()
  overrides: Record<string, Record<string, unknown>>;

  @ApiProperty()
  @IsDefined()
  to: TriggerRecipientsType; // eslint-disable-line @typescript-eslint/no-explicit-any

  @ApiProperty()
  @IsString()
  @IsOptional()
  transactionId: string;
}
