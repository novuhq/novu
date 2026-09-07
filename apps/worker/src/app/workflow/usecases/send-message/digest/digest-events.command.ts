import { BaseCommand } from '@novu/application-generic';
import { JobEntity } from '@novu/dal';
import { IsDefined } from 'class-validator';

export class DigestEventsCommand extends BaseCommand {
  @IsDefined()
  _subscriberId: string;

  @IsDefined()
  currentJob: JobEntity;
}
