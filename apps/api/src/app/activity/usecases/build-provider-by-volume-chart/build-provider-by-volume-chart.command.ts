import { EnvironmentCommand } from '@novu/application-generic';
import { IsDate, IsDefined } from 'class-validator';

export class BuildProviderByVolumeChartCommand extends EnvironmentCommand {
  @IsDate()
  @IsDefined()
  startDate: Date;

  @IsDate()
  @IsDefined()
  endDate: Date;

  static create(
    data: Pick<BuildProviderByVolumeChartCommand, 'environmentId' | 'organizationId' | 'startDate' | 'endDate'>
  ) {
    return Object.assign(new BuildProviderByVolumeChartCommand(), data);
  }
}
