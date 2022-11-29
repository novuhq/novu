import { ApiProperty } from '@nestjs/swagger';

class Twilio {
  @ApiProperty()
  authToken: string;
  @ApiProperty()
  accountSid: string;
  @ApiProperty()
  phoneNumber: string;
}

export class UpdateSmsSettingsRequestDto {
  @ApiProperty({
    type: Twilio,
  })
  twillio: Twilio;
}
