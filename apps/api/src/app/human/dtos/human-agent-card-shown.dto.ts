import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgentLookDto } from './human-agent-look.dto';

/**
 * The agent's card as a host shows it to its operator (`agent_card` over MCP, `agentinbox card` in the CLI): what
 * the agent says, and what its card holds.
 */
export class ShowHumanAgentCardResponseDto {
  @ApiProperty({
    description:
      'What the agent says as it shows its card: "Hi Ada, I’m Sid. I have my own inbox now. Here’s my card, so people can email or message me directly."',
  })
  greeting: string;

  @ApiProperty({ description: 'The agent’s name.' })
  name: string;

  @ApiPropertyOptional({
    description: 'The part of its address before the `@`, e.g. `sid`. Missing while the agent has no address.',
  })
  handle?: string;

  @ApiPropertyOptional({ description: 'Its email address, e.g. `sid@agentinbox.md`. Missing while it has none.' })
  address?: string;

  @ApiPropertyOptional({
    description:
      'Its public card, where anyone can email or message it, e.g. `https://agentinbox.md/p/sid`. Missing while the card isn’t public: when only its contacts can reach it.',
  })
  url?: string;

  @ApiPropertyOptional({ description: 'Where anyone can load the agent’s picture. Missing when it has none.' })
  pictureUrl?: string;

  @ApiProperty({ type: AgentLookDto, description: 'How the agent looks: its mascot and its card’s art.' })
  look: AgentLookDto;

  @ApiPropertyOptional({ description: 'The operator’s first name, as the greeting uses it. Missing without one.' })
  operatorFirstName?: string;

  @ApiProperty({ description: 'Whether this was the first time any host showed the card.' })
  firstShown: boolean;
}
