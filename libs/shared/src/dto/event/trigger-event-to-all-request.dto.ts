import { IsDefined, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TriggerEventToAllRequestDto {
  @ApiProperty()
  @IsString()
  @IsDefined()
  name: string;

  @ApiProperty()
  @IsObject()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @ApiProperty()
  @IsString()
  @IsOptional()
  transactionId: string;

  @ApiProperty()
  @IsObject()
  @IsOptional()
  overrides: Record<string, Record<string, unknown>>;
}
