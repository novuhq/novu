import { ChannelTypeEnum, ResourceOriginEnum, ResourceTypeEnum, ShortIsPrefixEnum } from '@novu/shared';
import { JSONSchemaDto } from '../../dtos/json-schema.dto';
import { EmailControlsDto, LayoutControlValuesDto } from '../../dtos/layout/layout-controls.dto';
import { LayoutResponseDto } from '../../dtos/layout/layout-response.dto';
import { LayoutDto } from '../../dtos/layout/v0/layout.dto';
import { buildSlug } from '../../utils/build-slug';

export const mapLayoutToResponseDto = ({
  layout,
  controlValues,
  variables,
}: {
  layout: LayoutDto;
  controlValues?: Record<string, unknown> | null;
  variables?: JSONSchemaDto;
}): LayoutResponseDto => {
  const email = controlValues?.email as EmailControlsDto | undefined;
  const values: LayoutControlValuesDto = {};
  if (layout.channel === ChannelTypeEnum.EMAIL && email) {
    values.email = { ...email, editorType: email.editorType ?? 'block' };
  }

  return {
    _id: layout._id as string,
    layoutId: layout.identifier,
    name: layout.name,
    slug: buildSlug(layout.name, ShortIsPrefixEnum.LAYOUT, layout._id as string),
    isDefault: layout.isDefault,
    updatedAt: layout.updatedAt as string,
    updatedBy: layout.updatedBy
      ? {
          _id: layout.updatedBy._id,
          firstName: layout.updatedBy.firstName,
          lastName: layout.updatedBy.lastName,
          externalId: layout.updatedBy.externalId,
        }
      : undefined,
    createdAt: layout.createdAt as string,
    origin: layout.origin as ResourceOriginEnum,
    type: layout.type as ResourceTypeEnum,
    variables,
    controls: {
      uiSchema: layout.controls?.uiSchema,
      dataSchema: layout.controls?.dataSchema,
      values,
    },
    isTranslationEnabled: !!layout.isTranslationEnabled,
  };
};
