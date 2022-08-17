import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsString } from 'class-validator';

export class CreateNotificationGroupRequestDto {
  @ApiProperty()
  @IsString()
  @IsDefined()
  name: string;
}
