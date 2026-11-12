import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import type { WhatsAppEmbeddedSignupFailure } from '../../integrations/dtos/whatsapp-embedded-signup.dto';
import { HumanAgentQueryDto } from './human-agent.dto';

/** The template an agent sends first when someone's 24-hour WhatsApp window has closed. */
export class HumanWhatsAppFirstMessageDto {
  @ApiProperty({ description: "Meta's review: PENDING, APPROVED, REJECTED, PAUSED, DISABLED or IN_APPEAL." })
  status: string;

  @ApiProperty({ description: 'The latest submitted text, with `{{agent_name}}` where the agent’s name goes.' })
  body: string;

  @ApiPropertyOptional({ description: 'Why Meta rejected it.' })
  rejectedReason?: string;

  @ApiProperty({ description: 'An approved version exists, so agents can write first outside the window.' })
  approved: boolean;

  @ApiPropertyOptional({ description: 'The approved text still in use while a newer one is under review.' })
  approvedBody?: string;
}

/** Where the operator's WhatsApp Business account stands, for the WhatsApp drawer on agentinbox.md. */
export class HumanWhatsAppSetupResponseDto {
  @ApiProperty({ description: 'False hides WhatsApp entirely: the channel is turned off for this organization.' })
  enabled: boolean;

  @ApiProperty({ description: 'Whether Embedded Signup can be completed here.' })
  available: boolean;

  @ApiPropertyOptional({ enum: ['feature_disabled', 'missing_platform_config'] })
  reason?: 'feature_disabled' | 'missing_platform_config';

  @ApiPropertyOptional({ description: 'Meta app id for FB.init. Public.' })
  appId?: string;

  @ApiPropertyOptional({ description: 'Embedded Signup configuration id for FB.login. Public.' })
  configId?: string;

  @ApiProperty({
    description: 'WhatsApp works for the operator: the business number is linked and their own number is bound.',
  })
  connected: boolean;

  @ApiPropertyOptional({ description: 'A WhatsApp Business number is linked to the relay agent and can send.' })
  businessConnected?: boolean;

  @ApiPropertyOptional({ description: 'The linked business number as WhatsApp shows it.' })
  displayPhoneNumber?: string;

  @ApiPropertyOptional({ description: 'The operator proved their own WhatsApp number with a code.' })
  operatorNumberBound?: boolean;

  @ApiPropertyOptional({ description: 'The operator’s own WhatsApp number, in E.164.' })
  operatorPhoneNumber?: string;

  @ApiPropertyOptional({
    type: () => HumanWhatsAppFirstMessageDto,
    description: 'The first message for outside the 24-hour window, once one was sent to Meta for review.',
  })
  firstMessage?: HumanWhatsAppFirstMessageDto;
}

export class SubmitHumanWhatsAppFirstMessageRequestDto extends HumanAgentQueryDto {
  @ApiProperty({ description: 'The message, with `{{agent_name}}` where the agent’s name goes.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  body: string;
}

/** A wa.me link with a one-time code that binds the sender's WhatsApp number. */
export class HumanWhatsAppLinkResponseDto {
  @ApiProperty({ description: 'Opens WhatsApp at the business number with the code ready to send.' })
  url: string;

  @ApiProperty({ description: 'The code, `BCDF-GHJK`, for typing by hand.' })
  code: string;

  @ApiProperty({ description: 'When the code stops working.' })
  expiresAt: string;
}

export class ConnectHumanWhatsAppRequestDto extends HumanAgentQueryDto {
  @ApiProperty({ description: 'Authorization code from Meta Embedded Signup (FB.login).' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  code: string;

  @ApiProperty({ description: 'WhatsApp Business Account id from the WA_EMBEDDED_SIGNUP session event.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  wabaId: string;

  @ApiProperty({ description: 'Phone number id from the WA_EMBEDDED_SIGNUP session event.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  phoneNumberId: string;

  // Any string, as integration identifiers are when they're created.
  @ApiPropertyOptional({ description: 'The relay’s WhatsApp channel to connect. Defaults to its active one.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  integrationIdentifier?: string;
}

export class ConnectHumanWhatsAppResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiPropertyOptional()
  displayPhoneNumber?: string;

  @ApiPropertyOptional({ description: 'The number was saved, but Meta did not register it yet.' })
  phoneRegistrationWarning?: string;

  @ApiPropertyOptional()
  error?: WhatsAppEmbeddedSignupFailure;
}
