import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class RequestLogResponseDto {
  @ApiProperty({ description: 'Request log identifier' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @IsString()
  createdAt: string;

  @ApiProperty({ description: 'HTTP method' })
  @IsString()
  method: string;

  @ApiProperty({ description: 'HTTP status code' })
  @IsNumber()
  statusCode: number;

  @ApiProperty({ description: 'Request path' })
  @IsString()
  path: string;

  @ApiPropertyOptional({ description: 'Transaction identifier', nullable: true })
  @IsOptional()
  @IsString()
  transactionId: string | null;

  @ApiProperty({ description: 'Request body' })
  @IsString()
  requestBody: string;

  @ApiProperty({ description: 'Response body' })
  @IsString()
  responseBody: string;
}

export class GetRequestsResponseDto {
  @ApiProperty({ description: 'Request log data', type: [RequestLogResponseDto] })
  @Type(() => RequestLogResponseDto)
  data: RequestLogResponseDto[]; // todo not reuse the get request response dto, instead make it leaner

  @ApiProperty({ description: 'Total number of requests' })
  @IsNumber()
  total: number;

  @ApiPropertyOptional({ description: 'Page size' })
  @IsOptional()
  @IsNumber()
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Current page number' })
  @IsOptional()
  @IsNumber()
  page?: number;
}
