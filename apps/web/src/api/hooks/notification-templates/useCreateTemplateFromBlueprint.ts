import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import {
  IBlueprint,
  ICreateNotificationTemplateDto,
  INotificationTemplate,
  INotificationTemplateStep,
} from '@novu/shared';

import { createTemplate } from '../../notification-templates';

const mapBlueprintToTemplate = (blueprint: IBlueprint): ICreateNotificationTemplateDto => ({
  name: blueprint.name,
  tags: blueprint.tags,
  description: blueprint.description,
  steps: blueprint.steps as INotificationTemplateStep[],
  notificationGroupId: blueprint._notificationGroupId,
  notificationGroup: blueprint.notificationGroup,
  active: blueprint.active,
  draft: blueprint.draft,
  critical: blueprint.critical,
  preferenceSettings: blueprint.preferenceSettings,
  blueprintId: blueprint._id,
});

export const useCreateTemplateFromBlueprint = (
  options: UseMutationOptions<
    INotificationTemplate & { __source?: string },
    any,
    { blueprint: IBlueprint; params: { __source?: string } }
  > = {}
) => {
  const { mutate, ...rest } = useMutation<
    INotificationTemplate,
    any,
    { blueprint: IBlueprint; params: { __source?: string } }
  >((data) => createTemplate(mapBlueprintToTemplate(data.blueprint), data.params), {
    ...options,
  });

  return {
    createTemplateFromBlueprint: mutate,
    ...rest,
  };
};
