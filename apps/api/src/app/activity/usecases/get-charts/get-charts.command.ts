import { EnvironmentCommand } from '@novu/application-generic';
import { IsArray, IsDateString, IsDefined, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { ReportTypeEnum } from '../../dtos/shared.dto';

export class GetChartsCommand extends EnvironmentCommand {
  @IsDateString()
  @IsOptional()
  createdAtGte?: string;

  @IsDateString()
  @IsOptional()
  createdAtLte?: string;

  @IsEnum(ReportTypeEnum, { each: true })
  @IsDefined()
  @IsArray()
  reportType: ReportTypeEnum[];
}
