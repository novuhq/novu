import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { StepTypeEnum } from '@novu/shared';
import type { IResponseError, ICreateNotificationTemplateDto, INotificationTemplate } from '@novu/shared';

import { createTemplate } from '../../notification-templates';
import { parseUrl } from '../../../utils/routeUtils';
import { ROUTES } from '../../../constants/routes.enum';
import { errorMessage } from '../../../utils/notifications';
import { useNotificationGroup, useTemplates } from '../../../hooks';
import { v4 as uuid4 } from 'uuid';
import { TemplateCreationSourceEnum } from '../../../pages/templates/shared';
import { FIRST_100_WORKFLOWS } from '../../../constants/workflowConstants';

export const useCreateDigestDemoWorkflow = () => {
  const navigate = useNavigate();
  const { groups, loading: areNotificationGroupLoading } = useNotificationGroup();
  const { mutateAsync: createNotificationTemplate, isLoading: isCreating } = useMutation<
    INotificationTemplate & { __source?: string },
    IResponseError,
    { template: ICreateNotificationTemplateDto; params: { __source?: string } }
  >((data) => createTemplate(data.template, data.params), {
    onSuccess: (template) => {
      navigate(parseUrl(ROUTES.WORKFLOWS_DIGEST_PLAYGROUND, { templateId: template._id as string }));
    },
    onError: () => {
      errorMessage('Failed to create Digest Workflow');
    },
  });
  const { templates = [], loading: templatesLoading } = useTemplates(FIRST_100_WORKFLOWS);
  const digestOnboardingTemplate = 'Digest Workflow Example';

  const createDigestDemoWorkflow = useCallback(() => {
    if (templatesLoading) return;

    const digestTemplateExists = templates.find((template) => template.name.includes(digestOnboardingTemplate));

    if (digestTemplateExists) {
      navigate(parseUrl(ROUTES.WORKFLOWS_DIGEST_PLAYGROUND, { templateId: digestTemplateExists._id as string }));
    } else {
      const payload = {
        name: digestOnboardingTemplate,
        notificationGroupId: groups[0]._id,
        active: true,
        draft: false,
        critical: false,
        tags: [],
        steps: [
          {
            template: { type: StepTypeEnum.DIGEST, content: '' },
            metadata: { amount: '10', unit: 'seconds', type: 'regular', digestKey: '' },
            active: true,
            uuid: uuid4(),
            filters: [],
          },
          {
            template: {
              subject: 'Digest Workflow Example',
              senderName: 'Novu',
              type: StepTypeEnum.EMAIL,
              contentType: 'customHtml',
              variables: [{ type: 'String', name: 'step.digest', defaultValue: '1', required: false }],
              preheader: '',
              content: "Hi {{subscriber.firstName}}! 👋 You've sent {{step.total_count}} events!",
            },
            uuid: uuid4(),
            active: true,
          },
        ],
      };

      createNotificationTemplate({
        template: payload as any,
        params: { __source: TemplateCreationSourceEnum.ONBOARDING_DIGEST_DEMO },
      });
    }
  }, [createNotificationTemplate, navigate, templatesLoading, groups, templates]);

  return {
    createDigestDemoWorkflow,
    isLoading: isCreating,
    isDisabled: areNotificationGroupLoading || isCreating,
  };
};
