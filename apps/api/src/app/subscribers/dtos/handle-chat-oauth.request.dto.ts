import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class HandleChatOauthRequestDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  code: string;
}
