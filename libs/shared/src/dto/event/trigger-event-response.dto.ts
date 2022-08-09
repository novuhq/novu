import { IsBoolean, IsDefined, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TriggerEventResponseDto {
  @ApiProperty()
  @IsBoolean()
  @IsDefined()
  acknowledged: boolean;

  @ApiProperty()
  @IsString()
  @IsDefined()
  status: string;

  @ApiProperty()
  @IsString()
  transactionId?: string;
}
