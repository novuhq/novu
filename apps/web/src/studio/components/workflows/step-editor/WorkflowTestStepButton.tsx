import { errorMessage, successMessage } from '@novu/design-system';
import { useMutation } from '@tanstack/react-query';
import { IconPlayArrow } from '@novu/novui/icons';
import { testSendEmailMessage } from '../../../../api/notification-templates';
import { ChannelTypeEnum } from '@novu/shared';
import { Button } from '@novu/novui';
import { useAuth } from '../../../../hooks/useAuth';
import { useSegment } from '../../../../components/providers/SegmentProvider';
import { useIsStudio } from '../../../hooks/useIsStudio';

export const WorkflowTestStepButton = ({
  stepId,
  payload,
  controls,
  workflowId,
  stepType,
}: {
  stepId: string;
  payload: Record<string, any>;
  controls: Record<string, any>;
  workflowId: string;
  stepType: ChannelTypeEnum;
}) => {
  const segment = useSegment();
  const isStudio = useIsStudio();
  const { currentUser } = useAuth();
  const { mutateAsync: testSendEmailEvent, isLoading: isTestingEmail } = useMutation(testSendEmailMessage);

  const handleTestClick = async () => {
    segment.track('Step test ran - [Workflows Step Page]', {
      step: ChannelTypeEnum.EMAIL,
      env: isStudio ? 'local' : 'cloud',
    });
    try {
      await testSendEmailEvent({
        stepId,
        workflowId,
        contentType: 'customHtml',
        subject: '',
        payload,
        inputs: controls,
        controls,
        to: currentUser?.email || '',
        bridge: true,
        content: '',
      });
      successMessage('Test run has started!');
    } catch (e: any) {
      errorMessage(e.message || 'Unexpected error occurred');
    }
  };

  if (stepType !== ChannelTypeEnum.EMAIL) {
    return null;
  }

  return (
    <Button loading={isTestingEmail} Icon={IconPlayArrow} variant="outline" onClick={handleTestClick}>
      Test step
    </Button>
  );
};
