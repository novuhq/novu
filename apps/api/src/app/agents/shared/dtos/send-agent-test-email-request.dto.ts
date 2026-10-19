import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class SendAgentTestEmailRequestDto {
  @ApiProperty({ description: 'Full inbound email address to send the test to (e.g. support@acme.com)' })
  @IsEmail()
  @IsNotEmpty()
  targetAddress: string;
}
