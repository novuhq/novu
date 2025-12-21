import { IsDefined, IsObject, IsString } from 'class-validator';

export class HandleSchedulerCallbackCommand {
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

  static create(dto: HandleSchedulerCallbackCommand) {
    const command = new HandleSchedulerCallbackCommand();
    Object.assign(command, dto);

    return command;
  }
}
