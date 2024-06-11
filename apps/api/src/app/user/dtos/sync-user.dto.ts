import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsString } from 'class-validator';

export class SyncExternalUserDto {
  @ApiProperty({
    description: 'External Clerk user id to sync with internal db.',
  })
  @IsString()
  @IsDefined()
  externalUserId: string;
}
