import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDefined, IsOptional, IsString } from 'class-validator';

export class WorkspaceDto {
  @ApiProperty({ example: 'T123456' })
  @IsDefined()
  @IsString()
  id: string;

  @ApiPropertyOptional({ example: 'Acme HQ' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class AuthDto {
  @ApiProperty({ example: 'Workspace access token' })
  @IsDefined()
  @IsString()
  accessToken: string;
}
