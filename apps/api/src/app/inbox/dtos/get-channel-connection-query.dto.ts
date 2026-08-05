import { ApiPropertyOptional } from '@nestjs/swagger';
import { ConnectionMode } from '@novu/shared';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class GetChannelConnectionQueryDto {
  @ApiPropertyOptional({
    description:
      'Scope results relative to the subscriber. `subscriber` returns only the subscriber-owned ' +
      'connections, `shared` returns only shared (workspace-level) connections. Omit to return both.',
    enum: ['subscriber', 'shared'],
    example: 'shared',
  })
  @IsOptional()
  @IsString()
  @IsIn(['subscriber', 'shared'])
  connectionMode?: ConnectionMode;
}
