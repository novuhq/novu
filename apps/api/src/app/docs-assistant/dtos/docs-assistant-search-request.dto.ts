import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class DocsAssistantSearchRequestDto {
  @ApiProperty()
  @IsString()
  query: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  pageSize?: number;
}
