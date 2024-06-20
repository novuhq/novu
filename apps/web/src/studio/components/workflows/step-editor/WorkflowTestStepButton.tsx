import { errorMessage, successMessage } from '@novu/design-system';
import { useMutation } from '@tanstack/react-query';
import { IconPlayArrow } from '@novu/novui/icons';
import { testSendEmailMessage } from '../../../../api/notification-templates';
import { ChannelTypeEnum } from '@novu/shared';
import { Button } from '@novu/novui';
import { useAuth } from '../../../../hooks/useAuth';

export const WorkflowTestStepButton = ({
  stepId,
  payload,
  inputs,
  workflowId,
  stepType,
}: {
  stepId: string;
  payload: Record<string, any>;
  inputs: Record<string, any>;
  workflowId: string;
  stepType: ChannelTypeEnum;
}) => {
  const { currentUser } = useAuth();
  const { mutateAsync: testSendEmailEvent, isLoading: isTestingEmail } = useMutation(testSendEmailMessage);

  const handleTestClick = async () => {
    try {
      await testSendEmailEvent({
        stepId,
        workflowId,
        contentType: 'customHtml',
        subject: '',
        payload,
        inputs,
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
