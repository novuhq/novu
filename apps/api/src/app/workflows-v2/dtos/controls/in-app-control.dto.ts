import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUrl, MinLength, ValidateIf, ValidateNested } from 'class-validator';
import { SkipControlDto } from './skip.dto';

// Define enum for redirect target based on Zod schema
enum RedirectTargetEnum {
  SELF = '_self',
  BLANK = '_blank',
  PARENT = '_parent',
  TOP = '_top',
  UNFENCED_TOP = '_unfencedTop',
}

class RedirectDto {
  @ApiPropertyOptional({ description: 'URL for redirection. Must be a valid URL or start with / or {{ variable }}.' })
  /*
   * Note: Cannot directly validate complex regex like schema's with class-validator decorators easily.
   * Basic IsUrl or IsString might be sufficient for DTO, relying on backend Zod validation.
   */
  @IsString() // Using IsString as IsUrl might be too strict for template variables
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({
    description: 'Target window for the redirection.',
    enum: RedirectTargetEnum,
    default: RedirectTargetEnum.SELF,
  })
  @IsEnum(RedirectTargetEnum)
  @IsOptional()
  target?: RedirectTargetEnum;
}

class ActionDto {
  @ApiPropertyOptional({ description: 'Label for the action button.' })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiPropertyOptional({ description: 'Redirect configuration for the action.', type: RedirectDto })
  @ValidateNested()
  @Type(() => RedirectDto)
  @IsOptional()
  redirect?: RedirectDto; // Changed from url to redirect object
}

export class InAppControlDto extends SkipControlDto {
  @ApiPropertyOptional({
    description: 'Content/body of the in-app message. Required if subject is empty.',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  @ValidateIf((obj) => !obj.subject || obj.subject.length === 0)
  @IsOptional()
  body?: string;

  @ApiPropertyOptional({ description: 'Subject/title of the in-app message. Required if body is empty.', minLength: 1 })
  @IsString()
  @MinLength(1)
  @ValidateIf((obj) => !obj.body || obj.body.length === 0)
  @IsOptional()
  subject?: string;

  @ApiPropertyOptional({
    description: 'URL for an avatar image. Must be a valid URL or start with / or {{ variable }}.',
  })
  // Note: Cannot directly validate complex regex like schema's with class-validator decorators easily.
  @IsString() // Using IsString
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({ description: 'Primary action button details.', type: ActionDto })
  @ValidateNested()
  @Type(() => ActionDto)
  @IsOptional()
  primaryAction?: ActionDto;

  @ApiPropertyOptional({ description: 'Secondary action button details.', type: ActionDto })
  @ValidateNested()
  @Type(() => ActionDto)
  @IsOptional()
  secondaryAction?: ActionDto;

  @ApiPropertyOptional({
    description: 'Redirection URL configuration for the main content click (if no actions defined/clicked)..',
    type: RedirectDto,
  })
  @ValidateNested()
  @Type(() => RedirectDto)
  @IsOptional()
  redirect?: RedirectDto;

  @ApiPropertyOptional({ description: 'Disable sanitization of the output.', default: false })
  @IsBoolean()
  @IsOptional()
  disableOutputSanitization?: boolean = false;

  @ApiPropertyOptional({
    description: 'Additional data payload for the step.',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  data?: Record<string, unknown>;
}
