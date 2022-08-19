import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDefined, IsMongoId, IsOptional } from 'class-validator';

export class CreateEnvironmentRequestDto {
  @ApiProperty()
  @IsDefined()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  parentId?: string;
}
