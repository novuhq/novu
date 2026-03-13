import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class BaseIssueDto<T> {
  @ApiProperty({
    description: 'Type of the issue',
    type: 'string',
  })
  @IsString()
  issueType: T;

  @ApiPropertyOptional({
    description: 'Name of the variable related to the issue',
    type: 'string',
  })
  @IsOptional()
  @IsString()
  variableName?: string;

  @ApiProperty({
    description: 'Detailed message describing the issue',
    type: 'string',
  })
  @IsString()
  message: string;
}
