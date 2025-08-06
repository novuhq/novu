import { ChannelTypeEnum, ShortIsPrefixEnum } from '@novu/shared';
import { LayoutDto } from '../../layouts-v1/dtos/layout.dto';
import { JSONSchemaDto } from '../../shared/dtos/json-schema.dto';
import { buildSlug } from '../../shared/helpers/build-slug';
import { LayoutResponseDto } from '../dtos';
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
    slug: buildSlug(layout.name, ShortIsPrefixEnum.LAYOUT, layout._id!),
    isDefault: layout.isDefault,
    updatedAt: layout.updatedAt!,
    updatedBy: layout.updatedBy
      ? {
          _id: layout.updatedBy._id,
          firstName: layout.updatedBy.firstName,
          lastName: layout.updatedBy.lastName,
          externalId: layout.updatedBy.externalId,
        }
      : undefined,
    createdAt: layout.createdAt!,
    origin: layout.origin!,
    type: layout.type!,
    variables,
    controls: {
      uiSchema: layout.controls?.uiSchema,
      dataSchema: layout.controls?.dataSchema,
      values: {
        ...(isEmailLayout ? { email: controlValues?.email as EmailControlsDto } : {}),
      },
    },
  };
};
