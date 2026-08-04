import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';

export class IngestAgentEventsBodyDto {
  @ApiProperty({
    description: 'Batch of AgentEvent envelopes emitted by the SDK outbox, in the order they were produced.',
    type: 'array',
    items: { type: 'object' },
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => Object)
  events: Record<string, unknown>[];
}
