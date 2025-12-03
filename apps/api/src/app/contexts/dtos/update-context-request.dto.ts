import { ApiProperty } from '@nestjs/swagger';
import { IsValidContextData } from '@novu/application-generic';
import { ContextData } from '@novu/shared';
import { IsDefined } from 'class-validator';

export class UpdateContextRequestDto {
  @ApiProperty({
    description: 'Custom data to associate with this context. Replaces existing data.',
    example: { tenantName: 'Acme Corp', region: 'us-east-1', settings: { theme: 'dark' } },
    required: true,
    type: 'object',
    additionalProperties: true,
  })
  @IsDefined()
  @IsValidContextData()
  data: ContextData;
}
