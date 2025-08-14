import { IsDateString, IsDefined, IsEnum, IsOptional } from 'class-validator';
import { ReportTypeEnum } from './shared.dto';

export class GetChartsRequestDto {
  @IsDateString()
  @IsOptional()
  createdAtGte?: string;

  @IsDateString()
  @IsOptional()
  createdAtLte?: string;

  @IsEnum(ReportTypeEnum, { each: true })
  @IsDefined()
  reportType: ReportTypeEnum[];
}
