import { IsDefined, IsObject, IsString } from 'class-validator';

export class SchedulerCallbackRequestDto {
  @IsDefined()
  @IsString()
  jobId: string;

  @IsDefined()
  @IsString()
  mode: string;

  @IsDefined()
  @IsObject()
  data: {
    _environmentId: string;
    _id: string;
    _organizationId: string;
    _userId: string;
  };
}

export class SchedulerCallbackResponseDto {
  success: boolean;
  jobId: string;
}
