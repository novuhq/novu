import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgentLookDto } from '../../../human/dtos/human-agent-look.dto';

export class TelegramMobileLinkStatusResponseDto {
  @ApiProperty({ type: Boolean })
  valid: boolean;

  @ApiPropertyOptional({
    type: String,
    enum: ['expired', 'used', 'invalid'],
    description: 'Populated when valid is false',
  })
  reason?: 'expired' | 'used' | 'invalid';

  @ApiPropertyOptional({ type: String, description: 'Display name of the agent being configured' })
  agentName?: string;

  @ApiPropertyOptional({ type: String, description: 'Provider being configured (always "telegram")' })
  providerName?: string;

  @ApiPropertyOptional({
    type: AgentLookDto,
    description:
      'An Agent Inbox agent’s look, for the mascot on its setup page. Missing while its mascots show the original one.',
  })
  agentLook?: AgentLookDto;
}
