import { useQuery } from '@tanstack/react-query';
import styled from '@emotion/styled';

import { colors } from '@novu/design-system';

import { ROUTES } from '../../../constants/routes.enum';
import { useCreateTemplateFromBlueprint } from '../../../api/hooks';
import { errorMessage } from '../../../utils/notifications';
import { getBlueprintTemplateById } from '../../../api/notification-templates';
import { getWorkflowBlueprintDetails } from '../../../utils';
import { TemplateCreationSourceEnum } from '../../templates/shared';
import { useSegment } from '../../../components/providers/SegmentProvider';

export function CreateWorkflowButton({
  blueprintIdentifier,
  children,
}: {
  blueprintIdentifier: string;
  children: string;
}) {
  const openNewTab = (route: ROUTES, param: string) =>
    window.open(`${window.location.origin}${route.replace(':templateId', param)}`, '_blank', 'noreferrer noopener');

  const { createTemplateFromBlueprint } = useCreateTemplateFromBlueprint({
    onSuccess: (template) => {
      openNewTab(ROUTES.WORKFLOWS_EDIT_TEMPLATEID, template._id ?? '');
    },
    onError: () => {
      errorMessage('Something went wrong while creating template from blueprint, please try again later.');
    },
  });

  const { refetch } = useQuery(
    ['blueprint', blueprintIdentifier],
    () => getBlueprintTemplateById(blueprintIdentifier as string),
    {
      enabled: false,
      refetchOnWindowFocus: false,

      onSuccess: (data) => {
        if (data) {
          const { name: blueprintName } = getWorkflowBlueprintDetails(data.name);
          createTemplateFromBlueprint({
            blueprint: { ...data, name: blueprintName },
            params: { __source: TemplateCreationSourceEnum.ONBOARDING_GET_STARTED },
          });
        }
      },
    }
  );

  const segment = useSegment();
  const handleCreateTemplateClick = () => {
    segment.track('[Template Store] Click Create Notification Template', {
      templateIdentifier: blueprintIdentifier,
      location: TemplateCreationSourceEnum.ONBOARDING_GET_STARTED,
    });

    refetch();
  };

  return <UnstyledButton onClick={() => handleCreateTemplateClick()}>{children}</UnstyledButton>;
}

export const UnstyledButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
  outline: inherit;
  color: ${colors.gradientEnd};
`;
