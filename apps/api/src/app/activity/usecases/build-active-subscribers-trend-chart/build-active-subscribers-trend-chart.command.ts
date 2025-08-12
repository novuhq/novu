import { EnvironmentCommand } from '@novu/application-generic';
import { IsDate, IsDefined } from 'class-validator';

export class BuildActiveSubscribersTrendChartCommand extends EnvironmentCommand {
  @IsDate()
  @IsDefined()
  startDate: Date;

  @IsDate()
  @IsDefined()
  endDate: Date;

  static create(
    data: Pick<BuildActiveSubscribersTrendChartCommand, 'environmentId' | 'organizationId' | 'startDate' | 'endDate'>
  ) {
    return Object.assign(new BuildActiveSubscribersTrendChartCommand(), data);
  }
}
