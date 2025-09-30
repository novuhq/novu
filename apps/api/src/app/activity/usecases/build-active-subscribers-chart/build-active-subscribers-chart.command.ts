import { EnvironmentCommand } from '@novu/application-generic';
import { IsDate, IsDefined } from 'class-validator';

export class BuildActiveSubscribersChartCommand extends EnvironmentCommand {
  @IsDate()
  @IsDefined()
  startDate: Date;

  @IsDate()
  @IsDefined()
  endDate: Date;
}
