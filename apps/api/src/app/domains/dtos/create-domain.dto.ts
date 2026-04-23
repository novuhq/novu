import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateDomainDto {
  @ApiProperty({ description: 'The domain name (e.g. "recent.dev")' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
