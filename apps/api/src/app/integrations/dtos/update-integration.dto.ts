import { ApiProperty } from '@nestjs/swagger';
import { IUpdateIntegrationBodyDto } from '@novu/shared';
import { IsBoolean, IsDefined, ValidateNested } from 'class-validator';
import { CredentialsDto } from './credentials.dto';
import { Type } from 'class-transformer';

export class UpdateIntegrationRequestDto implements IUpdateIntegrationBodyDto {
  @ApiProperty()
  @IsDefined()
  @IsBoolean()
  active: boolean;

  @ApiProperty({
    type: CredentialsDto,
  })
  @IsDefined()
  @Type(() => CredentialsDto)
  @ValidateNested()
  credentials: CredentialsDto;

  @ApiProperty()
  @IsDefined()
  @IsBoolean()
  check: boolean;
}
