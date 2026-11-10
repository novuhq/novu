import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type { WhatsAppEmbeddedSignupFailure } from '../../integrations/dtos/whatsapp-embedded-signup.dto';
import { HumanAgentQueryDto } from './human-agent.dto';

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

  @ApiProperty({ description: 'A WhatsApp Business number is linked to the relay agent and can send.' })
  connected: boolean;

  @ApiPropertyOptional({ description: 'The linked business number as WhatsApp shows it.' })
  displayPhoneNumber?: string;
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
