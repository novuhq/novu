import slugify from 'slugify';
import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import type { INotificationTemplate } from '@novu/shared';

import { useCreateTemplateFromBlueprint } from '../api/hooks';
import { getBlueprintTemplateById, getTemplateById } from '../api/notification-templates';
import { TemplateCreationSourceEnum } from '../pages/templates/shared';
import { getWorkflowBlueprintDetails } from '../utils';

export const useCreateWorkflowFromBlueprint = (
  options: UseMutationOptions<INotificationTemplate, any, { blueprintIdentifier: string }> = {}
) => {
  const { mutateAsync: createTemplateFromBlueprint } = useCreateTemplateFromBlueprint();

  const { mutate: createWorkflowFromBlueprint, ...createWorkflowFromBlueprintMutationProps } = useMutation(
    async ({ blueprintIdentifier }) => {
      const blueprintData = await getBlueprintTemplateById(blueprintIdentifier);
      const { name: blueprintName } = getWorkflowBlueprintDetails(blueprintData.name);

      try {
        const workflowIdentifier = slugify(blueprintName, {
          lower: true,
          strict: true,
        });

        return await getTemplateById(workflowIdentifier);
      } catch (_error) {
        return await createTemplateFromBlueprint({
          blueprint: { ...blueprintData, name: blueprintName },
          params: { __source: TemplateCreationSourceEnum.ONBOARDING_GET_STARTED },
        });
      }
    },
    options
  );

  return { ...createWorkflowFromBlueprintMutationProps, createWorkflowFromBlueprint };
};
