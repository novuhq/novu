import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUrl } from 'class-validator';

export class UpdateAgentBridgeRequestDto {
  @ApiPropertyOptional({ description: 'Production bridge URL for this agent' })
  @IsUrl({ require_tld: false })
  @IsOptional()
  bridgeUrl?: string;

  @ApiPropertyOptional({ description: 'Development bridge URL (set by npx novu dev)' })
  @IsUrl({ require_tld: false })
  @IsOptional()
  devBridgeUrl?: string;

  @ApiPropertyOptional({ description: 'Whether the dev bridge override is active' })
  @IsBoolean()
  @IsOptional()
  devBridgeActive?: boolean;
}
