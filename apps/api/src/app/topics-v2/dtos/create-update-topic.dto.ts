import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsValidContextData } from '@novu/application-generic';
import { TopicCustomData } from '@novu/shared';
import { IsNotEmpty, IsObject, IsOptional, IsString, Length, ValidateIf } from 'class-validator';

export class CreateUpdateTopicRequestDto {
  @ApiProperty({
    description:
      'The unique key identifier for the topic. The key must contain only alphanumeric characters (a-z, A-Z, 0-9), hyphens (-), underscores (_), colons (:), or be a valid email address.',
    example: 'task:12345',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  key: string;

  @ApiPropertyOptional({
    description: 'The display name for the topic',
    example: 'Task Title',
  })
  @IsString()
  @IsOptional()
  @Length(0, 100)
  name?: string;

  @ApiPropertyOptional({
    description:
      'Additional custom data associated with the topic. Flat key-value pairs of scalars (string, number, boolean, string[]). Maximum size: 64KB.',
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
