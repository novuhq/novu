import { IsOptional, IsString } from 'class-validator';

export class DashboardInboxHashesQueryDto {
  @IsOptional()
  @IsString()
  agentIdentifier?: string;
}
