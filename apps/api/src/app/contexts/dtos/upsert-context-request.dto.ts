import { ApiProperty } from '@nestjs/swagger';
import { CONTEXT_IDENTIFIER_REGEX, ContextData, ContextType } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Length, Matches, ValidateNested } from 'class-validator';
import { CONTEXT_DATA_MAX_SIZE_BYTES, IsContextDataSizeValid } from '../validators/context-data-size.validator';

export class UpsertContextRequestDto {
  @ApiProperty({
    description: 'The type of the context.',
    example: 'tenant',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  type: ContextType;

  @ApiProperty({
    description:
      'The unique id for the context. The id must contain only alphanumeric characters (a-z, A-Z, 0-9), hyphens (-), or underscores (_). IDs must be unique within type and environment.',
    example: 'org-acme',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100, { message: 'ID must be between 1 and 100 characters long' })
  @Matches(CONTEXT_IDENTIFIER_REGEX, {
    message: 'ID must contain only alphanumeric characters (a-z, A-Z, 0-9), hyphens (-), or underscores (_)',
  })
  id: string;

  @ApiProperty({
    description: `Context data object containing metadata. Maximum size is ${Math.round(CONTEXT_DATA_MAX_SIZE_BYTES / 1024)}KB.`,
    example: { tenantName: 'Acme Corp', region: 'us-east-1', settings: { theme: 'dark' } },
    required: false,
  })
  @ValidateNested()
  @Type(() => Object)
  @IsContextDataSizeValid()
  @IsOptional()
  data?: ContextData;
}
