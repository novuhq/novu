import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { ICreateNotificationTemplateDto, INotificationTemplate } from '@novu/shared';

import { createTemplate } from '../../notification-templates';

const mapBlueprintToTemplate = (blueprint: INotificationTemplate): ICreateNotificationTemplateDto => ({
  name: blueprint.name,
  tags: blueprint.tags,
  description: blueprint.description,
  steps: blueprint.steps,
  notificationGroupId: blueprint._notificationGroupId,
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
    { blueprint: INotificationTemplate; params: { __source?: string } }
  > = {}
) => {
  const { mutate, ...rest } = useMutation<
    INotificationTemplate,
    any,
    { blueprint: INotificationTemplate; params: { __source?: string } }
  >((data) => createTemplate(mapBlueprintToTemplate(data.blueprint), data.params), {
    ...options,
  });

  return {
    createTemplateFromBlueprint: mutate,
    ...rest,
  };
};
