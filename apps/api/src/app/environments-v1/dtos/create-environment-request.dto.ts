import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDefined, IsHexColor, IsMongoId, IsOptional, IsString } from 'class-validator';

export class CreateEnvironmentRequestDto {
  @ApiProperty({
    type: String,
    description: 'Name of the environment to be created',
    example: 'Production Environment',
  })
  @IsDefined({ message: 'Environment name is required' })
  @IsString({ message: 'Environment name must be a string' })
  name: string;

  @ApiPropertyOptional({
    type: String,
    description: 'MongoDB ObjectId of the parent environment (optional)',
    example: '60d5ecb8b3b3a30015f3e1a1',
  })
  @IsOptional()
  @IsMongoId({ message: 'Parent ID must be a valid MongoDB ObjectId' })
  parentId?: string;

  @ApiProperty({
    type: String,
    description: 'Hex color code for the environment',
    example: '#3498db',
  })
  @IsDefined({ message: 'Environment color is required' })
  @IsHexColor({ message: 'Color must be a valid hex color code' })
  color: string;
}
