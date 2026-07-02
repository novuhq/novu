import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DomainRouteTypeEnum, DomainStatusEnum } from '@novu/shared';

export class TestDomainRouteWebhookResultDto {
  @ApiPropertyOptional({
    description: 'True when outbound webhooks are disabled for this environment (nothing was emitted).',
  })
  skipped?: boolean;

  @ApiProperty()
  latencyMs: number;
}

export class TestDomainRouteAgentResultDto {
  @ApiProperty()
  agentId: string;

  @ApiProperty()
  httpStatus: number;

  @ApiPropertyOptional({ description: 'Parsed JSON body from the agent webhook response when JSON.' })
  agentReply?: unknown;

  @ApiProperty()
  latencyMs: number;
}

export class TestDomainRouteResponseDto {
  @ApiProperty()
  matched: boolean;

  @ApiProperty()
  dryRun: boolean;

  @ApiPropertyOptional({ enum: DomainStatusEnum })
  domainStatus?: DomainStatusEnum;

  @ApiPropertyOptional()
  mxRecordConfigured?: boolean;

  @ApiPropertyOptional({ enum: DomainRouteTypeEnum })
  type?: DomainRouteTypeEnum;

  @ApiPropertyOptional({ description: 'Human-readable delivery target summary in dry-run mode.' })
  wouldDeliverTo?: string;

  @ApiPropertyOptional({
    type: Object,
    description: 'The outbound payload (dry-run only).',
    additionalProperties: true,
  })
  payload?: Record<string, unknown>;

  @ApiPropertyOptional({ type: TestDomainRouteWebhookResultDto })
  webhook?: TestDomainRouteWebhookResultDto;

  @ApiPropertyOptional({ type: TestDomainRouteAgentResultDto })
  agent?: TestDomainRouteAgentResultDto;
}
