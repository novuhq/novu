import { IsDefined, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class SchedulerCallbackRequestDto {
  @IsDefined()
  @IsString()
  jobId: string;

  @IsDefined()
  @IsString()
  type: string;

  @IsDefined()
  @IsObject()
  data: {
    _environmentId: string;
    _id: string;
    _organizationId: string;
    _userId: string;
  };

  @IsOptional()
  @IsObject()
  metadata?: {
    mode?: string;
    workflowId?: string;
    subscriberId?: string;
    stepId?: string;
  };
}

export class SchedulerCallbackResponseDto {
  success: boolean;
  jobId: string;
}

