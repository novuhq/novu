import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TriggerRecipientsPayload } from '@novu/shared';
import { IsDefined, IsObject, IsOptional, IsString } from 'class-validator';
import { IsTriggerRecipientsPayload } from '../validators/is-trigger-recipients-payload.validator';

export class ResumeWaitRequestDto {
  @ApiProperty({
    description: 'Identifier of the Wait step to resume',
    example: 'await-answer',
  })
  @IsString()
  @IsDefined()
  stepId: string;

  @ApiProperty({
    description: 'Recipients whose parked Wait jobs should resume. Same shape as trigger `to`.',
  })
  @IsDefined()
  @IsTriggerRecipientsPayload()
  to: TriggerRecipientsPayload;

  @ApiPropertyOptional({
    description: 'Optional payload stored on the Wait result as `data`',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
