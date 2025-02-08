import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDefined, IsHexColor, IsMongoId, IsOptional, IsString } from 'class-validator';

export class CreateEnvironmentRequestDto {
  @ApiProperty()
  @IsDefined()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  parentId?: string;

  @ApiProperty()
  @IsDefined()
  @IsHexColor()
  color: string;
}
