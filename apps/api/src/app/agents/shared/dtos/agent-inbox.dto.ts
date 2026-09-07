import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/**
 * Request body for `PATCH /agents/:identifier/inbox/shared`.
 * Disabling is refused when no custom-domain inbox is configured so the agent
 * is never left with zero inbound addresses.
 */
export class UpdateAgentInboxSharedRequestDto {
  @ApiProperty({ description: 'When true, drop inbound mail to the Novu shared inbox for this agent.' })
  @IsBoolean()
  disabled: boolean;
}
