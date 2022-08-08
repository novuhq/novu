import { IsBoolean, IsDefined, IsString } from 'class-validator';

export class DeleteSubscriberResponseDto {
  @IsBoolean()
  @IsDefined()
  acknowledged: boolean;

  @IsString()
  @IsDefined()
  status: string;
}
