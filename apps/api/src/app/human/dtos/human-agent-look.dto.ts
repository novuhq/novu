import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AGENT_CARD_ART_KINDS,
  AGENT_CARD_ART_MAX_SEED,
  AGENT_HOST_IDS,
  AGENT_HOST_VIAS,
  AGENT_LOOK_COLORS,
  AGENT_MASCOT_BODIES,
  type AgentCardArtKind,
  type AgentHostId,
  type AgentHostVia,
  type AgentLookColor,
  type AgentMascotBody,
} from '@novu/dal';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsObject, Max, Min, ValidateNested } from 'class-validator';

/** The dotted drawing across the top of an agent card: a kind of drawing, and the seed that draws one of them. */
export class AgentCardArtDto {
  @ApiProperty({ enum: [...AGENT_CARD_ART_KINDS], description: 'The kind of drawing.' })
  @IsIn(AGENT_CARD_ART_KINDS)
  kind: AgentCardArtKind;

  @ApiProperty({
    description: 'Draws one drawing of its kind, the same one wherever the card is shown.',
    minimum: 0,
    maximum: AGENT_CARD_ART_MAX_SEED,
  })
  @IsInt()
  @Min(0)
  @Max(AGENT_CARD_ART_MAX_SEED)
  seed: number;
}

/**
 * How an agent looks: its mascot's shape and colour, and its card's art. An agent whose operator never picked one
 * has the original look, an orb in ember with rays.
 */
export class AgentLookDto {
  @ApiProperty({ enum: [...AGENT_MASCOT_BODIES], description: 'The mascot’s shape. `orb` is the original, round one.' })
  @IsIn(AGENT_MASCOT_BODIES)
  shape: AgentMascotBody;

  @ApiProperty({
    enum: [...AGENT_LOOK_COLORS],
    description: 'The colour of the mascot and the card’s art. `ember` is the original orange.',
  })
  @IsIn(AGENT_LOOK_COLORS)
  color: AgentLookColor;

  @ApiProperty({ type: AgentCardArtDto })
  @IsObject()
  @ValidateNested()
  @Type(() => AgentCardArtDto)
  art: AgentCardArtDto;
}

/** The first time a host showed the agent's card. */
export class AgentCardShownDto {
  @ApiProperty({ description: 'When, as an ISO timestamp.' })
  at: string;

  @ApiPropertyOptional({
    enum: [...AGENT_HOST_VIAS],
    description: 'The way the host that showed it came in. Missing when it didn’t say.',
  })
  via?: AgentHostVia;

  @ApiPropertyOptional({
    enum: [...AGENT_HOST_IDS],
    description: 'The host that showed it. Missing when it didn’t say.',
  })
  host?: AgentHostId;
}
