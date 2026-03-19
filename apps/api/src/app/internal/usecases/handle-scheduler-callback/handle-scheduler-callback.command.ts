import { BaseCommand } from '@novu/application-generic';
import { IsDefined, IsObject, IsString } from 'class-validator';

export class HandleSchedulerCallbackCommand extends BaseCommand {
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
