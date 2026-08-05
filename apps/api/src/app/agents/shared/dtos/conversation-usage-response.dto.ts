import { ApiProperty } from '@nestjs/swagger';

/**
 * Active-conversations usage for the current billing period, summed across the
 * organization's environments. `included` is the plan limit (`null` for
 * unlimited tiers). Counting is informational — nothing is reported to Stripe.
 */
export class ConversationUsageResponseDto {
  @ApiProperty({ description: 'Active conversations counted for the organization in the current billing period.' })
  current: number;

  @ApiProperty({
    description: 'Active conversations included in the organization plan. `null` when the tier is unlimited.',
    type: Number,
    nullable: true,
  })
  included: number | null;

  @ApiProperty({ description: 'Inclusive UTC start of the current billing period (ISO 8601).' })
  periodStart: string;

  @ApiProperty({ description: 'Exclusive UTC end of the current billing period (ISO 8601).' })
  periodEnd: string;
}
