import { EnvironmentLevelCommand } from '@novu/application-generic';
import { IsDate, IsDefined, IsString } from 'class-validator';

export class BuildWorkflowByVolumeChartCommand extends EnvironmentLevelCommand {
  @IsString()
  organizationId: string;

  @IsString()
  environmentId: string;

  @IsDate()
  @IsDefined()
  startDate: Date;

  @IsDate()
  @IsDefined()
  endDate: Date;
}
