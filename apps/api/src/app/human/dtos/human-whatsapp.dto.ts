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

  @ApiPropertyOptional({
    description:
      'Connected with API keys and the webhook still to add in Meta: the callback URL and verify token. Only to the operator’s dashboard, and only until their number is connected.',
  })
  webhook?: { configured: boolean; callbackUrl: string; verifyToken?: string };
}

export class SubmitHumanWhatsAppFirstMessageRequestDto extends HumanAgentQueryDto {
  @ApiProperty({ description: 'The message, with `{{agent_name}}` where the agent’s name goes.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  body: string;
}

/** A wa.me link that binds the operator's own WhatsApp number with the first message they send. */
export class HumanWhatsAppLinkResponseDto {
  @ApiProperty({ description: 'Opens WhatsApp at the business number with a message ready to send.' })
  url: string;

  @ApiProperty({ description: 'The one-time code the link carries, `BCDF-GHJK`, for typing by hand.' })
  code: string;

  @ApiProperty({ description: 'When the window for the operator’s first message closes.' })
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

export class ConnectHumanWhatsAppKeysRequestDto extends HumanAgentQueryDto {
  @ApiProperty({ description: 'A Meta System User access token with whatsapp_business_messaging.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  accessToken: string;

  @ApiProperty({ description: 'The phone number id from the Meta app’s API Setup page.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  phoneNumberId: string;

  @ApiProperty({ description: 'The WhatsApp Business Account id the number belongs to.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  businessAccountId: string;

  @ApiProperty({ description: 'The Meta app’s secret, from App settings › Basic, to check Meta’s webhook signatures.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  appSecret: string;

  @ApiPropertyOptional({ description: 'The relay’s WhatsApp channel to connect. Defaults to its active one.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  integrationIdentifier?: string;
}

/** Where Meta sends the number's messages: set for the operator when Meta allowed it, otherwise for them to add. */
export class HumanWhatsAppWebhookDto {
  @ApiProperty({ description: 'Meta accepted the webhook, so nothing is left to add in the Meta app.' })
  configured: boolean;

  @ApiProperty({ description: 'The callback URL for the Meta app’s WhatsApp webhook.' })
  callbackUrl: string;

  @ApiPropertyOptional({ description: 'The verify token to paste next to it, while the webhook is still to add.' })
  verifyToken?: string;

  @ApiPropertyOptional({ description: 'Why Meta didn’t take the webhook automatically.' })
  reason?: string;
}

export type HumanWhatsAppKeysFailure = {
  code:
    | 'invalid_token'
    | 'expired_token'
    | 'phone_not_found'
    | 'phone_mismatch'
    | 'waba_not_accessible'
    | 'waba_phone_mismatch'
    | 'missing_messaging_scope'
    | 'unknown';
  message: string;
};

export class ConnectHumanWhatsAppKeysResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiPropertyOptional({ description: 'The business number as WhatsApp shows it.' })
  displayPhoneNumber?: string;

  @ApiPropertyOptional({ type: HumanWhatsAppWebhookDto })
  webhook?: HumanWhatsAppWebhookDto;

  @ApiPropertyOptional({ description: 'Why Meta refused the keys. Nothing was saved.' })
  error?: HumanWhatsAppKeysFailure;
}
