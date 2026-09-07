import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ChatOauthRequestDto {
  @ApiProperty({
    description: 'HMAC hash for the request',
    type: String,
  })
  hmacHash: string;

  @ApiProperty({
    description: 'The ID of the environment, must be a valid MongoDB ID',
    type: String,
    required: true,
  })
  environmentId: string;

  @ApiProperty({
    description: 'Optional integration identifier',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  integrationIdentifier?: string;
}

export class ChatOauthCallbackRequestDto extends ChatOauthRequestDto {
  @ApiProperty({
    description: 'Optional authorization code returned from the OAuth provider',
    type: String,
    required: true,
  })
  @IsString()
  code: string; // Make sure to define code as optional

  @ApiPropertyOptional({
    description: 'Signed state issued by the chat OAuth endpoint and echoed back by the provider',
    type: String,
  })
  @IsOptional()
  @IsString()
  state?: string;
}
