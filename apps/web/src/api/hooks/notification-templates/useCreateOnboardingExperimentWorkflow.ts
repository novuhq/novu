import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { v4 as uuid4 } from 'uuid';
import { EmailProviderIdEnum, StepTypeEnum } from '@novu/shared';
import type { IResponseError, ICreateNotificationTemplateDto, INotificationTemplate } from '@novu/shared';
import { QueryKeys } from '@novu/shared-web';

import { createTemplate } from '../../notification-templates';
import { parseUrl } from '../../../utils/routeUtils';
import { ROUTES } from '../../../constants/routes.enum';
import { errorMessage } from '../../../utils/notifications';
import { useNotificationGroup, useTemplates, useIntegrations } from '../../../hooks';
import { FIRST_100_WORKFLOWS } from '../../../constants/workflowConstants';
import { IntegrationEntity } from '../../../pages/integrations/types';
import { setIntegrationAsPrimary } from '../../../api/integration';

export const useCreateOnboardingExperimentWorkflow = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { groups, loading: areNotificationGroupLoading } = useNotificationGroup();

  const { mutateAsync: createNotificationTemplate, isLoading: isCreating } = useMutation<
    INotificationTemplate & { __source?: string },
    IResponseError,
    { template: ICreateNotificationTemplateDto; params: { __source?: string } }
  >((data) => createTemplate(data.template, data.params), {
    onSuccess: (template) => {
      navigate(parseUrl(ROUTES.WORKFLOWS_EDIT_TEMPLATEID, { templateId: template._id as string }));
    },
    onError: () => {
      errorMessage('Failed to create onboarding experiment Workflow');
    },
  });

  const { mutate: makePrimaryIntegration, isLoading: isPrimaryEmailIntegrationLoading } = useMutation<
    IntegrationEntity,
    IResponseError,
    { id: string }
  >(({ id }) => setIntegrationAsPrimary(id), {
    onSuccess: () => {
      queryClient.refetchQueries({
        predicate: ({ queryKey }) =>
          queryKey.includes(QueryKeys.integrationsList) || queryKey.includes(QueryKeys.activeIntegrations),
      });
    },
    onError: () => {
      errorMessage("Failed to update integration's primary status");
    },
  });

  const { templates = [], loading: templatesLoading } = useTemplates(FIRST_100_WORKFLOWS);

  const { integrations, loading: isIntegrationsLoading } = useIntegrations();

  const onboardingExperimentWorkflow = 'Onboarding Workflow';

  const createOnboardingExperimentWorkflow = useCallback(() => {
    if (templatesLoading) return;

    const onboardingExperimentWorkflowExists = templates.find((template) =>
      template.name.includes(onboardingExperimentWorkflow)
    );

    const novuEmailIntegration = integrations?.find(
      (integration) => integration.providerId === EmailProviderIdEnum.Novu
    );

    if (novuEmailIntegration && !novuEmailIntegration?.primary) {
      makePrimaryIntegration({ id: novuEmailIntegration?._id as string });
    }

    if (onboardingExperimentWorkflowExists) {
      navigate(
        parseUrl(ROUTES.WORKFLOWS_EDIT_TEMPLATEID, { templateId: onboardingExperimentWorkflowExists._id as string })
      );
    } else {
      const payload = {
        name: onboardingExperimentWorkflow,
        notificationGroupId: groups[0]._id,
        active: true,
        draft: false,
        critical: false,
        tags: ['onboarding'],
        steps: [
          {
            template: {
              subject: 'Your first email notification from Novu!',
              senderName: 'Novu Onboarding',
              type: StepTypeEnum.EMAIL,
              contentType: 'customHtml',
              content:
                // eslint-disable-next-line max-len
                'It\'s that simple! <br/>Learn more about creating workflows <a href="https://docs.novu.co/workflows/notification-workflows">here</a>.',
            },
            uuid: uuid4(),
            active: true,
          },
        ],
      };

      createNotificationTemplate({
        template: payload as any,
        params: { __source: 'Onboarding Experiment Workflow' },
      });
    }
  }, [templatesLoading, templates, integrations, makePrimaryIntegration, navigate, groups, createNotificationTemplate]);

  return {
    createOnboardingExperimentWorkflow,
    isLoading: isPrimaryEmailIntegrationLoading || isCreating,
    isDisabled:
      areNotificationGroupLoading ||
      templatesLoading ||
      isIntegrationsLoading ||
      isPrimaryEmailIntegrationLoading ||
      isCreating,
  };
};
