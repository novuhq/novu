import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UserResponseDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  _id: string;

  @ApiPropertyOptional({ description: 'User first name', nullable: true })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'User last name', nullable: true })
  @IsOptional()
  @IsString()
  lastName?: string | null;

  @ApiPropertyOptional({ description: 'User external ID', nullable: true })
  @IsOptional()
  @IsString()
  externalId?: string;
}
