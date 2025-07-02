import { ChannelTypeEnum } from '@novu/shared';

import { LayoutResponseDto } from '../dtos';
import { LayoutDto } from '../../layouts-v1/dtos/layout.dto';
import { JSONSchemaDto } from '../../shared/dtos/json-schema.dto';
import { EmailControlsDto } from '../dtos/layout-controls.dto';

export const mapToResponseDto = ({
  layout,
  controlValues,
  variables,
}: {
  layout: LayoutDto;
  controlValues?: Record<string, unknown> | null;
  variables?: JSONSchemaDto;
}): LayoutResponseDto => {
  const isEmailLayout = layout.channel === ChannelTypeEnum.EMAIL && controlValues?.email;

  return {
    _id: layout._id!,
    layoutId: layout.identifier,
    name: layout.name,
    isDefault: layout.isDefault,
    updatedAt: layout.updatedAt!,
    createdAt: layout.createdAt!,
    origin: layout.origin!,
    type: layout.type!,
    variables,
    // TODO: implement issues
    issues: undefined,
    controls: {
      uiSchema: layout.controls?.uiSchema,
      dataSchema: layout.controls?.dataSchema,
      values: {
        ...(isEmailLayout ? { email: controlValues?.email as EmailControlsDto } : {}),
      },
    },
  };
};
