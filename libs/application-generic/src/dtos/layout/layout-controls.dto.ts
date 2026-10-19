import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';

export class EmailControlsDto {
  @ApiProperty({
    description: 'Body of the layout.',
  })
  @IsString()
  body: string;

  @ApiProperty({
    description: 'Editor type of the layout.',
    enum: ['html', 'block'],
  })
  @IsString()
  @IsEnum(['html', 'block'])
  editorType: 'html' | 'block';
}

export class LayoutControlValuesDto {
  @ApiPropertyOptional({
    description: 'Email layout controls',
  })
  @IsOptional()
  @ValidateNested()
  email?: EmailControlsDto;
}
