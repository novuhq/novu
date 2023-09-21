import { StepFilter } from '@novu/dal';
import { IsDefined } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../commands';
import { IJob, INotificationTemplateStep } from '@novu/shared';

export class ConditionsFilterCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  filters: StepFilter[];

  job?: IJob;

  step?: INotificationTemplateStep;
}
