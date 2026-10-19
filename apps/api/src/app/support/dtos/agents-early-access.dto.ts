import { Type } from 'class-transformer';
import { IsArray, IsDefined, IsString, ValidateNested } from 'class-validator';

export class HowAgentRunsTodayDto {
  @IsDefined()
  @IsString()
  value: string;

  @IsDefined()
  @IsString()
  label: string;
}

export class PlannedProviderDto {
  @IsDefined()
  @IsString()
  id: string;

  @IsDefined()
  @IsString()
  label: string;
}

export class AgentsEarlyAccessDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => HowAgentRunsTodayDto)
  howAgentRunsToday: HowAgentRunsTodayDto;

  @IsDefined()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlannedProviderDto)
  plannedProviders: PlannedProviderDto[];

  @IsDefined()
  @IsString()
  whatAgentDoes: string;
}
