import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { ChannelTypeEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';

import { LayoutPreviewPayloadDto } from './layout-preview-payload.dto';

export class EmailLayoutRenderOutput {
  @ApiProperty({ description: 'Content of the email' })
  @IsString()
  body: string;
}

@ApiExtraModels(EmailLayoutRenderOutput)
export class GenerateLayoutPreviewResponseDto {
  @ApiProperty({
    description: 'Preview payload example',
    type: () => LayoutPreviewPayloadDto,
  })
  @ValidateNested()
  @Type(() => LayoutPreviewPayloadDto)
  previewPayloadExample: LayoutPreviewPayloadDto;

  @ApiPropertyOptional({
    description: 'The payload schema that was used to generate the preview payload example',
    type: 'object',
    nullable: true,
    additionalProperties: true,
  })
  @IsOptional()
  schema?: unknown;

  @ApiProperty({
    description: 'Preview result',
    oneOf: [
      {
        properties: {
          type: { enum: [ChannelTypeEnum.EMAIL] },
          preview: { $ref: getSchemaPath(EmailLayoutRenderOutput) },
        },
      },
    ],
  })
  result: {
    type: ChannelTypeEnum.EMAIL;
    preview?: EmailLayoutRenderOutput;
  };
}
