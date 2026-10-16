import { ApiProperty } from '@nestjs/swagger';
import { HumanChannelViaEnum } from '@novu/shared';
import { IsEmail, IsEnum, IsNotEmpty, MaxLength } from 'class-validator';
import { HumanAgentQueryDto } from './human-agent.dto';

/** The operator picks which of their connected channels agents use when a message names none. */
export class SetOperatorDefaultChannelRequestDto extends HumanAgentQueryDto {
  @ApiProperty({ enum: HumanChannelViaEnum, description: 'A channel the operator is connected on.' })
  @IsEnum(HumanChannelViaEnum)
  via: HumanChannelViaEnum;
}

export class SetOperatorDefaultChannelResponseDto {
  @ApiProperty({ enum: HumanChannelViaEnum })
  defaultVia: HumanChannelViaEnum;
}

/** The operator gives a new email address. It is used once they confirm it from the email it gets. */
export class ChangeOperatorEmailRequestDto extends HumanAgentQueryDto {
  @ApiProperty({ description: 'The new address. A confirmation link is sent to it.' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(254)
  address: string;
}
