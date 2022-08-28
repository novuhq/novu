import { ApiProperty } from '@nestjs/swagger';

export class UpdateMailSettingsRequestDto {
  @ApiProperty()
  senderEmail: string;
  @ApiProperty()
  senderName: string;
}
