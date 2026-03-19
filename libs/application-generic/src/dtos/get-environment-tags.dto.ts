import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsString } from 'class-validator';

export class GetEnvironmentTagsDto {
  @ApiProperty()
  @IsDefined()
  @IsString()
  name: string;
}
