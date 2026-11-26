import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class CopilotSettingsDto {
  @ApiProperty({ description: 'Members can ask Copilot on dashboard pages. It acts with each member’s own role.' })
  dashboardEnabled: boolean;

  @ApiProperty({ description: 'Members can @mention the Novu Copilot in Slack channels where the app is installed.' })
  slackEnabled: boolean;

  @ApiProperty({ description: 'Copilot may change workflows, integrations and subscribers in Development.' })
  editsEnabled: boolean;
}

export class UpdateCopilotSettingsDto {
  @ApiPropertyOptional({ description: 'Members can ask Copilot on dashboard pages.' })
  @IsOptional()
  @IsBoolean()
  dashboardEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Members can @mention the Novu Copilot in Slack.' })
  @IsOptional()
  @IsBoolean()
  slackEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Copilot may change workflows, integrations and subscribers in Development.' })
  @IsOptional()
  @IsBoolean()
  editsEnabled?: boolean;
}
