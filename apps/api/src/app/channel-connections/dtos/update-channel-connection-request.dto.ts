import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDefined, ValidateNested } from 'class-validator';
import { AuthDto, WorkspaceDto } from './shared.dto';

export class UpdateChannelConnectionRequestDto {
  @ApiProperty({ type: WorkspaceDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => WorkspaceDto)
  workspace: WorkspaceDto;

  @ApiProperty({ type: AuthDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => AuthDto)
  auth: AuthDto;
}
