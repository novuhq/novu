import { ApiProperty } from '@nestjs/swagger';
import {
  DomainDiagnosticCheckStatusEnum,
  DomainDiagnosticCodeEnum,
  DomainDiagnosticSeverityEnum,
} from '@novu/shared';

export class DomainDiagnosticCheckDto {
  @ApiProperty({ enum: DomainDiagnosticCodeEnum })
  code: DomainDiagnosticCodeEnum;

  @ApiProperty({ enum: DomainDiagnosticCheckStatusEnum })
  status: DomainDiagnosticCheckStatusEnum;

  @ApiProperty({ description: 'Round-trip time for this check in milliseconds' })
  latencyMs: number;
}

export class DomainDiagnosticIssueDto {
  @ApiProperty({ enum: DomainDiagnosticCodeEnum })
  code: DomainDiagnosticCodeEnum;

  @ApiProperty({ enum: DomainDiagnosticSeverityEnum })
  severity: DomainDiagnosticSeverityEnum;

  @ApiProperty()
  message: string;

  @ApiProperty({ description: 'Plain-language remediation guidance' })
  fix: string;
}

export class DiagnoseDomainResponseDto {
  @ApiProperty({ description: 'True when there are no error-severity issues' })
  ok: boolean;

  @ApiProperty({ description: 'ISO timestamp when the diagnostic run finished' })
  runAt: string;

  @ApiProperty({ type: [DomainDiagnosticCheckDto] })
  checks: DomainDiagnosticCheckDto[];

  @ApiProperty({ type: [DomainDiagnosticIssueDto] })
  issues: DomainDiagnosticIssueDto[];
}
