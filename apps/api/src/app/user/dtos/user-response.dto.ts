import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { JobTitleEnum } from '@novu/shared';

export class ServicesHashesDto {
  @ApiProperty()
  intercom?: string;
}

export class UserResponseDto {
  @ApiProperty()
  _id: string;

  @ApiPropertyOptional()
  resetToken?: string;

  @ApiPropertyOptional()
  resetTokenDate?: string;

  @ApiProperty()
  firstName?: string | null;

  @ApiProperty()
  lastName?: string | null;

  @ApiProperty()
  email?: string | null;

  @ApiProperty()
  profilePicture?: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiPropertyOptional()
  showOnBoarding?: boolean;

  @ApiProperty()
  servicesHashes?: ServicesHashesDto;

  @ApiPropertyOptional()
  jobTitle?: JobTitleEnum;
}
