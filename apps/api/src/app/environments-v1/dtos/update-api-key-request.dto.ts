import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateApiKeyRequestDto {
  @ApiProperty()
  @IsString()
  apiKey: string;
}
