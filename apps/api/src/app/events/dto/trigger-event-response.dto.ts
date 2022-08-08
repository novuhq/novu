import { IsBoolean, IsDefined, IsString } from 'class-validator';

export class TriggerEventResponseDto {
  @IsBoolean()
  @IsDefined()
  acknowledged: boolean;

  @IsString()
  @IsDefined()
  status: string;

  @IsString()
  transactionId?: string;
}
