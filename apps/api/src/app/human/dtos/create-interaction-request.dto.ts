import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  HUMAN_INTERACTION_MAX_TTL_SECONDS,
  HumanChannelViaEnum,
  HumanInteractionKindEnum,
  type HumanOptionInput,
} from '@novu/shared';
import { IsArray, IsEnum, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min, Validate } from 'class-validator';
import { IsValidHumanTo } from '../validators/is-valid-human-to';

export class HumanInteractionCardDto {
  @ApiProperty({ description: 'Card title. Required. Shown on every channel.' })
  @IsString()
  @MaxLength(4000)
  title: string;

  @ApiPropertyOptional({
    description:
      'Slack only. MCP catalog id (`stripe`, `github`) or display name, or an https URL (32×32). Ignored on other channels.',
  })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Secondary line under the title. Shown on every channel.' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  subtitle?: string;

  @ApiPropertyOptional({ description: 'Optional details under the subtitle. Shown on every channel.' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  body?: string;

  @ApiPropertyOptional({ description: 'Approve button label. Defaults to Approve.' })
  @IsOptional()
  @IsString()
  approveLabel?: string;

  @ApiPropertyOptional({ description: 'Deny button label. Defaults to Deny.' })
  @IsOptional()
  @IsString()
  denyLabel?: string;

  @ApiPropertyOptional({
    description: 'Extra approve buttons after Approve / Deny (max 4). Do not invent trust-tool or trust-server.',
  })
  @IsOptional()
  @IsArray()
  extraActions?: HumanOptionInput[];

  @ApiPropertyOptional({ description: 'Choose options (2–10). String label or `{ id, label }`.' })
  @IsOptional()
  @IsArray()
  options?: HumanOptionInput[];
}

export class CreateInteractionRequestDto {
  @ApiProperty({ enum: HumanInteractionKindEnum, description: 'Interaction verb.' })
  @IsEnum(HumanInteractionKindEnum)
  kind: HumanInteractionKindEnum;

  @ApiProperty({ description: 'Kind-specific card. `title` is required. Choose must set `card.options` (2–10).' })
  @IsObject()
  card: HumanInteractionCardDto;

  @ApiProperty({
    description:
      'subscriberId of the human to reach, or an array of subscriberIds. Any listed subscriber may settle (first valid answer wins).',
    oneOf: [
      { type: 'string', example: 'alice' },
      { type: 'array', items: { type: 'string' }, example: ['alice', 'bob'] },
    ],
  })
  @Validate(IsValidHumanTo)
  to: string | string[];

  @ApiPropertyOptional({
    enum: HumanChannelViaEnum,
    description:
      'Delivery channel preference. Required when the human is reachable on more than one linked channel; otherwise the sole linked channel is used.',
  })
  @IsOptional()
  @IsEnum(HumanChannelViaEnum)
  via?: HumanChannelViaEnum;

  @ApiPropertyOptional({
    description: 'Identifier of the agent that sends the DM. Defaults to `human-relay`.',
  })
  @IsOptional()
  @IsString()
  agentIdentifier?: string;

  @ApiPropertyOptional({ description: 'Attribution label of the calling agent, rendered in the message.' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  from?: string;

  @ApiPropertyOptional({
    description: `Seconds until the interaction expires. Default 86400 (24h), max ${HUMAN_INTERACTION_MAX_TTL_SECONDS} (72h — delivered buttons cannot outlive their action tokens).`,
  })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(HUMAN_INTERACTION_MAX_TTL_SECONDS)
  ttlSeconds?: number;
}
