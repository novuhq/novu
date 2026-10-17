import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches } from 'class-validator';

export class CreateKeylessEnvironmentRequestDto {
  @ApiPropertyOptional({
    description: 'Who is creating the environment, e.g. cursor, claude-code, codex, mcp, novu-cli',
    example: 'cursor',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9._-]{0,63}$/)
  source?: string;
}
