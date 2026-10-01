import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsValidContextData } from '@novu/application-generic';
import { ContextData } from '@novu/shared';
import { IsDefined, IsOptional, IsUrl } from 'class-validator';

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

  @ApiPropertyOptional({
    description:
      'Optional bridge URL override for agent connect. When an inbound agent turn resolves this context, ' +
      'its bridge call is routed here instead of the agent default bridge URL. Must be a publicly reachable URL. ' +
      'Pass null to clear an existing override.',
    example: 'https://tenant-acme.example.com/api/novu',
    type: String,
    nullable: true,
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  bridgeUrl?: string | null;
}
