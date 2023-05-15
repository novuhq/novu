import { IsDefined, IsMongoId } from 'class-validator';

export class ExecutionDetailsRequestDto {
  @IsDefined()
  @IsMongoId()
  notificationId: string;

  @IsDefined()
  @IsMongoId()
  subscriberId: string;
}
