import { IsDefined, IsMongoId, IsString } from 'class-validator';

export class ExecutionDetailsRequestDto {
  @IsDefined()
  @IsMongoId()
  notificationId: string;

  @IsDefined()
  @IsString()
  subscriberId: string;
}
