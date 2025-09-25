import { ApiProperty } from '@nestjs/swagger';
import { IsValidContextPayload } from '@novu/application-generic';
import { ContextPayload } from '@novu/shared';
import { IsDefined } from 'class-validator';

export class UpsertContextRequestDto {
  @ApiProperty({
    description: [
      'Context payload containing one or more contexts to upsert.',
      'Each context type maps to either a string ID or an object with ID and data (optional).',
      '',
      'For existing contexts:',
      '• Providing data will update/replace the existing data',
      '• Providing only an ID will leave existing data unchanged',
      '',
      'For new contexts:',
      '• Will be created with the provided data (or empty data by default)',
    ].join('\n'),
    example: {
      tenant: {
        id: 'org-acme',
        data: { tenantName: 'Acme Corp', region: 'us-east-1', settings: { theme: 'dark' } },
      },
      app: 'jira',
    },
    required: true,
  })
  @IsDefined()
  @IsValidContextPayload({ maxCount: 10 })
  context: ContextPayload;
}
