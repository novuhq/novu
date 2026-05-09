import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendAgentWelcomeMessageRequestDto {
  @ApiProperty({ description: 'Identifier of the integration to send the welcome message through' })
  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  @ApiPropertyOptional({
    description:
      'Existing conversation ID to post a bridge-connected follow-up message into. ' +
      'When provided, a "setup complete" message is posted to the existing conversation thread ' +
      'instead of opening a new DM.',
  })
  @IsString()
  @IsOptional()
  conversationId?: string;
}
