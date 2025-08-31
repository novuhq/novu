import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { RequestLogResponseDto } from './get-requests.response.dto';

export class TraceResponseDto {
  @ApiProperty({ description: 'Trace identifier' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @IsString()
  createdAt: string;

  @ApiProperty({ description: 'Event type (e.g., request_received, workflow_execution_started)' })
  @IsString()
  eventType: string;

  @ApiProperty({ description: 'Human readable title/message' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Detailed message', nullable: true })
  @IsOptional()
  @IsString()
  message?: string | null;

  @ApiProperty({ description: 'Raw data associated with trace', nullable: true })
  @IsOptional()
  @IsString()
  rawData?: string | null;

  @ApiProperty({ description: 'Trace status (success, error, warning, pending)' })
  @IsString()
  status: string;

  @ApiProperty({ description: 'Entity type (request, workflow_run, step_run)' })
  @IsString()
  entityType: string;

  @ApiProperty({ description: 'Entity identifier' })
  @IsString()
  entityId: string;

  @ApiProperty({ description: 'Organization identifier' })
  @IsString()
  organizationId: string;

  @ApiProperty({ description: 'Environment identifier' })
  @IsString()
  environmentId: string;

  @ApiProperty({ description: 'User identifier', nullable: true })
  @IsOptional()
  @IsString()
  userId?: string | null;

  @ApiProperty({ description: 'External subscriber identifier', nullable: true })
  @IsOptional()
  @IsString()
  externalSubscriberId?: string | null;

  @ApiProperty({ description: 'Subscriber identifier', nullable: true })
  @IsOptional()
  @IsString()
  subscriberId?: string | null;
}

export class GetRequestResponseDto {
  @ApiProperty({ description: 'Request details', type: RequestLogResponseDto })
  @Type(() => RequestLogResponseDto)
  request: RequestLogResponseDto;

  @ApiProperty({ description: 'Associated traces', type: [TraceResponseDto] })
  @Type(() => TraceResponseDto)
  traces: TraceResponseDto[];
}
