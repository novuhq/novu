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
  options: UseMutationOptions<INotificationTemplate, any, { blueprint: INotificationTemplate }> = {}
) => {
  const { mutate, ...rest } = useMutation<INotificationTemplate, any, { blueprint: INotificationTemplate }>(
    ({ blueprint }) => createTemplate(mapBlueprintToTemplate(blueprint)),
    { ...options }
  );

  return {
    createTemplateFromBlueprint: mutate,
    ...rest,
  };
};
