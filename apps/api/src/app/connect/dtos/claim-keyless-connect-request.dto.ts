import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ClaimKeylessConnectRequestDto {
  @ApiProperty({ description: 'The single-use claim token issued in the connected channel signup CTA.' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
