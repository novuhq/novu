import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDefined, IsString } from 'class-validator';

export class CreateTopicResponseDto {
  @ApiPropertyOptional({
    description: 'The unique identifier for the Topic created.',
  })
  _id: string;

  @ApiProperty({
    description:
      'User defined custom key and provided by the user that will be an unique identifier for the Topic created.',
  })
  key: string;
}

export class CreateTopicRequestDto {
  @ApiProperty({
    description:
      'User defined custom key and provided by the user that will be an unique identifier for the Topic created.',
  })
  @IsString()
  @IsDefined()
  key: string;

  @ApiProperty({
    description: 'User defined custom name and provided by the user that will name the Topic created.',
  })
  @IsString()
  @IsDefined()
  name: string;
}
