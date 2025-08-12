import { EnvironmentLevelCommand } from '@novu/application-generic';
import { IsDate, IsDefined } from 'class-validator';

export class BuildWorkflowByVolumeChartCommand extends EnvironmentLevelCommand {
  @IsDate()
  @IsDefined()
  startDate: Date;

  @IsDate()
  @IsDefined()
  endDate: Date;
}
