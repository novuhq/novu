import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';
import { SkipControlDto } from './skip.dto';

export class EmailControlDto extends SkipControlDto {
  @ApiProperty({ description: 'Subject of the email.', minLength: 1 })
  @IsString()
  @IsOptional()
  subject: string;

  @ApiProperty({
    description: 'Body content of the email, either a valid Maily JSON object, or html string.',
    default: '',
  })
  @IsString()
  body: string = '';

  @ApiPropertyOptional({
    description: 'Type of editor to use for the body.',
    enum: ['block', 'html'],
    default: 'block',
  })
  @IsString()
  @IsOptional()
  editorType?: 'block' | 'html' = 'block';

  @ApiPropertyOptional({ description: 'Disable sanitization of the output.', default: false })
  @IsBoolean()
  @IsOptional()
  disableOutputSanitization?: boolean = false;
}
