import { EnvironmentCommand } from '@novu/application-generic';
import { IsArray, IsDate, IsDefined, IsOptional, IsString } from 'class-validator';

export class BuildDeliveryTrendChartCommand extends EnvironmentCommand {
  @IsDate()
  @IsDefined()
  startDate: Date;

  @IsDate()
  @IsDefined()
  endDate: Date;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workflowIds?: string[];
}
