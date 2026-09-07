import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class SkipControlDto {
  @ApiPropertyOptional({
    description:
      'JSONLogic filter conditions for conditionally skipping the step execution. Supports complex logical operations with AND, OR, and comparison operators. See https://jsonlogic.com/ for full typing reference.',
    type: 'object',
    example: {
      and: [
        {
          '==': [
            {
              var: 'payload.tier',
            },
            'pro',
          ],
        },
        {
          '==': [
            {
              var: 'subscriber.data.role',
            },
            'admin',
          ],
        },
        {
          '>': [
            {
              var: 'payload.amount',
            },
            '4',
          ],
        },
      ],
    },
    additionalProperties: true,
  })
  @IsObject()
  @IsOptional()
  skip?: Record<string, unknown>;
}
