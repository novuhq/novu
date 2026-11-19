import { Type } from 'class-transformer';
import { IsArray, IsDefined, IsString, MaxLength, ValidateNested } from 'class-validator';

export class PlannedDataSourceDto {
  @IsDefined()
  @IsString()
  id: string;

  @IsDefined()
  @IsString()
  label: string;
}

export class DataSourcesEarlyAccessDto {
  @IsDefined()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlannedDataSourceDto)
  plannedSources: PlannedDataSourceDto[];

  @IsDefined()
  @IsString()
  @MaxLength(500)
  useCase: string;
}
