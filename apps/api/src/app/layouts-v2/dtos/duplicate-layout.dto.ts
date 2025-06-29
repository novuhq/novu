import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class DuplicateLayoutDto {
  @ApiProperty({ description: 'Name of the layout' })
  @IsString()
  name: string;
}
