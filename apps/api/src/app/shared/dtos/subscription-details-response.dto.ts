import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { SubscriptionPreferenceDto } from './subscriptions/create-subscriptions-response.dto';

export class SubscriptionDetailsResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the subscription',
    example: '64f5e95d3d7946d80d0cb679',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'The identifier of the subscription',
    example: 'subscription-identifier',
  })
  @IsString()
  identifier?: string;

  @ApiPropertyOptional({
    description: 'The name of the subscription',
    example: 'My Subscription',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'The preferences/rules for the subscription',
    type: [SubscriptionPreferenceDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubscriptionPreferenceDto)
  @IsOptional()
  preferences?: SubscriptionPreferenceDto[];

  @ApiPropertyOptional({
    description: 'Context keys that scope this subscription (e.g., tenant:org-a, project:proj-123)',
    example: ['tenant:org-a', 'project:proj-123'],
    type: [String],
  })
  contextKeys?: string[];
}
