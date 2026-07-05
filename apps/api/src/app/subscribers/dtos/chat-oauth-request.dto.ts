import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class ChatOauthRequestDto {
  @ApiProperty({
    description: 'HMAC hash for the request',
    type: String,
    required: true,
  })
  @IsString()
  hmacHash: string;

  @ApiProperty({
    description: 'The ID of the environment, must be a valid MongoDB ID',
    type: String,
    required: true,
  })
  @IsMongoId()
  @IsString()
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

export class ChatOauthCallbackRequestDto {
  @ApiProperty({
    description: 'Authorization code returned from the OAuth provider',
    type: String,
    required: true,
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Signed OAuth state returned from the OAuth provider',
    type: String,
    required: true,
  })
  @IsString()
  state: string;

  @ApiProperty({
    description: 'The ID of the environment, must be a valid MongoDB ID',
    type: String,
    required: true,
  })
  @IsMongoId()
  @IsString()
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
