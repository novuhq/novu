import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SigningSecretTypeEnum } from '@novu/shared';

export class SigningSecretResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty({ enum: SigningSecretTypeEnum })
  type: SigningSecretTypeEnum;

  @ApiProperty()
  environmentId: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  expiresAt?: string;

  @ApiPropertyOptional()
  revokedAt?: string;

  @ApiProperty()
  createdAt: string;
}

export class CreateSigningSecretResponseDto extends SigningSecretResponseDto {
  @ApiProperty({ description: 'Full signing secret — shown only once at creation' })
  secret: string;
}
