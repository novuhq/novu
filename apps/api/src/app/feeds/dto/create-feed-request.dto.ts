import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsString } from 'class-validator';

export class CreateFeedRequestDto {
  @ApiProperty()
  @IsString()
  @IsDefined()
  name: string;
}
