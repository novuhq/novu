import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class WorkflowAgentProviderConfigDto {
  @ApiPropertyOptional({
    description:
      "Novu-digestible inbound address for this agent (shared inbox or custom-domain agent route). Used as the outbound email Reply-To so replies route to the agent.",
    type: 'string',
  })
  @IsOptional()
  @IsString()
  replyTo?: string;
}

export class WorkflowAgentConfigDto {
  @ApiProperty({
    description: "Public agent identifier used to route this workflow through an agent's connected channels.",
    type: 'string',
  })
  @IsString()
  identifier: string;

  @ApiPropertyOptional({
    description:
      'Optional per-provider overrides keyed by providerId (e.g. novu-email-agent). Today only Novu Email replyTo is supported.',
    type: 'object',
    additionalProperties: {
      type: 'object',
      properties: {
        replyTo: { type: 'string' },
      },
    },
  })
  @IsOptional()
  @IsObject()
  providers?: Record<string, WorkflowAgentProviderConfigDto>;
}
