import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CompleteWhatsAppSignupLinkRequestDto {
  @ApiProperty({ type: String, description: 'Opaque single-use signup link token' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ type: String, description: 'Meta Embedded Signup authorization code' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ type: String, description: 'WhatsApp Business Account ID returned by Embedded Signup' })
  @IsString()
  @IsNotEmpty()
  wabaId: string;

  @ApiProperty({ type: String, description: 'Phone Number ID returned by Embedded Signup' })
  @IsString()
  @IsNotEmpty()
  phoneNumberId: string;
}
