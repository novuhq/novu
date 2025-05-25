import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateSupportThreadDto {
  @ApiProperty()
  @IsString()
  text: string;
}
