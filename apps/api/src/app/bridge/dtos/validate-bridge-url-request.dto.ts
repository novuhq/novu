import { ApiProperty } from '@nestjs/swagger';
import { IsUrl } from 'class-validator';

export class ValidateBridgeUrlRequestDto {
  @ApiProperty()
  @IsUrl({
    require_protocol: true,
    require_tld: false,
  })
  bridgeUrl: string;
}
