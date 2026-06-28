import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class DocsAssistantMessageRequestDto {
  @ApiProperty()
  @IsString()
  fp: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  threadId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  threadKey?: string;

  @ApiProperty()
  @IsArray()
  messages: unknown[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  retrievalPageSize?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  currentPath?: string;
}
