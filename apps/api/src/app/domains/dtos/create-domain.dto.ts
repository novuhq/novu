import { ApiProperty } from '@nestjs/swagger';
import { IsFQDN, IsNotEmpty, IsString } from 'class-validator';

export class CreateDomainDto {
  @ApiProperty({ description: 'The domain name (e.g. "recent.dev")' })
  @IsString()
  @IsNotEmpty()
  @IsFQDN({
    require_tld: true,
    allow_underscores: false,
    allow_trailing_dot: false,
    allow_numeric_tld: false,
    allow_wildcard: false,
  })
  name: string;
}
