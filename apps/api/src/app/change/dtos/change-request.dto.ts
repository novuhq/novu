import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ChangesRequestDto {
  @ApiPropertyOptional({
    type: Number,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 0;

  @ApiPropertyOptional({
    type: Number,
    required: false,
    default: 10,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(100)
  limit?: number = 10;

  @ApiProperty({
    type: String,
    required: true,
    default: 'false',
  })
  @IsDefined()
  @IsString()
  promoted: string;
}
