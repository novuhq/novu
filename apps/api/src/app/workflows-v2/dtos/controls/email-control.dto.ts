import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
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

  @ApiPropertyOptional({
    description: 'Type of renderer to use (raw HTML or React Email step resolver)',
    enum: ['html', 'react-email'],
    default: 'html',
  })
  @IsString()
  @IsIn(['html', 'react-email'])
  @IsOptional()
  rendererType?: 'html' | 'react-email' = 'html';

  @ApiPropertyOptional({ description: 'Disable sanitization of the output.', default: false })
  @IsBoolean()
  @IsOptional()
  disableOutputSanitization?: boolean = false;

  @ApiPropertyOptional({
    type: String,
    description: 'Layout ID to use for the email. Null means no layout, undefined means default layout.',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((obj) => obj.layoutId !== null)
  @IsString()
  @MinLength(1)
  layoutId?: string | null;
}
