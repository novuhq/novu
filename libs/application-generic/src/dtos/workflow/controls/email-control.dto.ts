import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { SkipControlDto } from '../skip.dto';

export class EmailFromControlDto {
  @ApiPropertyOptional({ description: 'Sender email address override for this step.' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Sender display name override for this step.' })
  @IsOptional()
  @IsString()
  name?: string;
}

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
  @IsIn(['block', 'html'])
  @IsString()
  @IsOptional()
  editorType?: 'block' | 'html' = 'block';

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

  @ApiPropertyOptional({
    type: () => EmailFromControlDto,
    description: 'Sender name and email overrides for this step.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailFromControlDto)
  from?: EmailFromControlDto;

  @ApiPropertyOptional({
    description:
      'When true, sender name/email use the primary email integration defaults and skip workflow agent defaults.',
  })
  @IsOptional()
  @IsBoolean()
  useProviderDefaults?: boolean;

  @ApiPropertyOptional({
    description: 'Step-level Reply-To override. When unset, inherits the workflow agent reply-to.',
  })
  @IsOptional()
  @IsString()
  replyTo?: string;

  @ApiPropertyOptional({
    description: 'One-line inbox preview text shown next to the subject.',
    maxLength: 84,
  })
  @IsOptional()
  @IsString()
  @MaxLength(84)
  preheader?: string;
}
