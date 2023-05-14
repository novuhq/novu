import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ChatOauthRequestDto {
  hmacHash: string;
}

export class ChatOauthCallbackRequestDto extends ChatOauthRequestDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  code: string;
}
