import { IsDefined, IsObject, IsOptional, IsString } from 'class-validator';

export class HandleSchedulerCallbackCommand {
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

  static create(dto: HandleSchedulerCallbackCommand) {
    const command = new HandleSchedulerCallbackCommand();
    Object.assign(command, dto);

    return command;
  }
}

