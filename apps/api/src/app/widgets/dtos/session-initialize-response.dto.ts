import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class Profile {
  @ApiProperty()
  _id: string;
  @ApiPropertyOptional()
  firstName?: string;
  @ApiPropertyOptional()
  lastName?: string;
  @ApiPropertyOptional()
  phone?: string;
}

export class SessionInitializeResponseDto {
  @ApiProperty()
  token: string;
  @ApiProperty()
  profile: Profile;
}
