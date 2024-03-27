import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileRequestDto {
  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  imageUrl: string;
}
