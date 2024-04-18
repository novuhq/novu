import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUrl } from 'class-validator';
import type { IUpdateUserProfile } from '@novu/shared';

import { IsImageUrl } from '../../shared/validators/image.validator';

const protocols = process.env.NODE_ENV === 'production' ? ['https'] : ['http', 'https'];
const hostWhitelist = ['production', 'test'].includes(process.env.NODE_ENV) ? undefined : ['localhost', 'web.novu.co'];

export class UpdateProfileRequestDto implements IUpdateUserProfile {
  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  @IsUrl({
    require_protocol: true,
    protocols,
    host_whitelist: hostWhitelist,
  })
  @IsImageUrl({
    message: 'Logo must be a valid image URL with one of the following extensions: jpg, jpeg, png, gif, svg',
  })
  @IsOptional()
  profilePicture?: string;
}
