import { ApiProperty } from '@nestjs/swagger';
import type { IUpdateUserProfile } from '@novu/shared';

export class UpdateProfileRequestDto implements IUpdateUserProfile {
  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  profilePicture?: string;
}
