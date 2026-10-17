import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ClaimKeylessEnvironmentRequestDto {
  @ApiProperty({ description: 'The single-use claim token from the claim URL.' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
