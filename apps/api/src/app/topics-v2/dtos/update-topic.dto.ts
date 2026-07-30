import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsValidContextData } from '@novu/application-generic';
import { TopicCustomData } from '@novu/shared';
import { IsObject, IsOptional, IsString, Length, ValidateIf } from 'class-validator';

export class UpdateTopicRequestDto {
  @ApiPropertyOptional({
    description: 'The display name for the topic',
    example: 'Updated Topic Name',
  })
  @IsString()
  @IsOptional()
  @Length(0, 100)
  name?: string;

  @ApiPropertyOptional({
    description:
      'Additional custom data associated with the topic. Flat key-value pairs of scalars (string, number, boolean, string[]). Maximum size: 64KB. Pass null to clear.',
    type: Object,
    nullable: true,
    additionalProperties: true,
    example: { category: 'product', priority: 1 },
  })
  @IsOptional()
  @ValidateIf((obj) => obj.data !== null)
  @IsObject()
  @IsValidContextData()
  data?: TopicCustomData | null;
}
