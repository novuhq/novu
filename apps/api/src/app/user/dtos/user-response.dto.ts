import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class UserResponseDto {
  @ApiProperty()
  _id: string;

  @ApiPropertyOptional()
  resetToken?: string;

  @ApiPropertyOptional()
  resetTokenDate?: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  profilePicture: string;

  @ApiProperty()
  createdAt: string;

  @ApiPropertyOptional()
  showOnBoarding?: boolean;
}
