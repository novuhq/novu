import { IsDefined } from 'class-validator';
import { JobEntity } from '@novu/dal';
import { BaseCommand } from '@novu/application-generic';

export class DigestEventsCommand extends BaseCommand {
  @IsDefined()
  _subscriberId: string;

  @IsDefined()
  currentJob: JobEntity;
}
