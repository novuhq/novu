import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HUMAN_INTERACTION_MAX_TTL_SECONDS, HumanChannelViaEnum, HumanInteractionKindEnum } from '@novu/shared';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Validate,
} from 'class-validator';
import { IsValidHumanTo } from '../validators/is-valid-human-to';

export class CreateInteractionRequestDto {
  @ApiProperty({ enum: HumanInteractionKindEnum, description: 'Interaction verb.' })
  @IsEnum(HumanInteractionKindEnum)
  kind: HumanInteractionKindEnum;

  @ApiProperty({ description: 'The question / action description / message shown to the human.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  prompt: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Choice labels — required for `choose`, ignored otherwise. Option ids are assigned server-side.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(75, { each: true })
  options?: string[];

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
