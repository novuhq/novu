import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsMongoId, IsOptional, IsString } from 'class-validator';

export class ChatOauthRequestDto {
  hmacHash: string;

  @IsMongoId()
  @IsDefined()
  environmentId: string;

  @IsOptional()
  @IsString()
  integrationIdentifier?: string;
}

export class ChatOauthCallbackRequestDto extends ChatOauthRequestDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  code: string;
}
