import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDefined, IsMongoId, IsOptional, IsString } from 'class-validator';

export class CreateEnvironmentRequestDto {
  @ApiProperty()
  @IsDefined()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  parentId?: string;
}
