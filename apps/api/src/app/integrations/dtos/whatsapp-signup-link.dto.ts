import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class IssueWhatsAppSignupLinkRequestDto {
  @ApiProperty({ type: String, description: 'External identifier of the agent the integration is linked to' })
  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @ApiProperty({ type: String, description: 'External identifier of the WhatsApp Business integration' })
  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;
}

export class IssueWhatsAppSignupLinkResponseDto {
  @ApiProperty({ type: String, description: 'Opaque single-use token backing the public signup page' })
  token: string;

  @ApiProperty({ type: String, description: 'Absolute URL of the public WhatsApp Embedded Signup page' })
  url: string;

  @ApiProperty({ type: String, description: 'ISO timestamp when this link expires' })
  expiresAt: string;
}
