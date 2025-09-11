import { ApiProperty } from '@nestjs/swagger';
import { CONTEXT_IDENTIFIER_REGEX, ContextData, ContextTypeEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, Length, Matches, ValidateNested } from 'class-validator';
import { CONTEXT_DATA_MAX_SIZE_BYTES, IsContextDataSizeValid } from '../validators/data-size.validator';

export class CreateContextRequestDto {
  @ApiProperty({ enum: ContextTypeEnum })
  @IsEnum(ContextTypeEnum)
  @IsNotEmpty()
  type: ContextTypeEnum;

  @ApiProperty({
    description:
      'The unique identifier for the context. The identifier must contain only alphanumeric characters (a-z, A-Z, 0-9), hyphens (-), or underscores (_). Identifiers must be unique within each environment.',
    example: 'tenant-123',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100, { message: 'Identifier must be between 1 and 100 characters long' })
  @Matches(CONTEXT_IDENTIFIER_REGEX, {
    message: 'Identifier must contain only alphanumeric characters (a-z, A-Z, 0-9), hyphens (-), or underscores (_)',
  })
  identifier: string;

  @ApiProperty({
    description: `Context data object containing metadata. Maximum size is ${Math.round(CONTEXT_DATA_MAX_SIZE_BYTES / 1024)}KB.`,
    example: { tenantName: 'Acme Corp', region: 'us-east-1', settings: { theme: 'dark' } },
  })
  @ValidateNested()
  @Type(() => Object)
  @IsContextDataSizeValid()
  data: ContextData;
}
