import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UserResponseDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  _id: string;

  @ApiProperty({ description: 'User first name' })
  @IsString()
  firstName: string;

  @ApiPropertyOptional({ description: 'User last name' })
  @IsOptional()
  @IsString()
  lastName?: string | null;

  @ApiPropertyOptional({ description: 'User external ID' })
  @IsOptional()
  @IsString()
  externalId?: string;
}
