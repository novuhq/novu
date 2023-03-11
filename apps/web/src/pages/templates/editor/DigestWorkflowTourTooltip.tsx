import { UnstyledButton } from '@mantine/core';
import styled from '@emotion/styled';
import { TooltipRenderProps } from 'react-joyride';
import { useFormContext } from 'react-hook-form';
import { StepTypeEnum } from '@novu/shared';

import { useTour } from './TourProvider';
import { Button, colors, DotsNavigation } from '../../../design-system';
import { Clock, LetterOpened, BellWithNotification } from '../../../design-system/icons';
import { useTemplateEditorContext } from './TemplateEditorProvider';
import { IForm } from '../components/formTypes';

const ICONS = [Clock, LetterOpened, BellWithNotification];
const TITLE = ['Set-up time interval', 'Set-up email content', 'Test your workflow'];
const DESCRIPTION = [
  'Specify for how long the digest should collect events before sending a digested event to the next step step in the workflow.',
  'Use custom HTML or our visual editor to define how the email will look like when sent to the subscriber.',
  'We will trigger the workflow multiple times to represent how it aggregates notifications.',
];

const TooltipHolder = styled.div`
  display: flex;
  flex-direction: column;
  width: 300px;
  padding: 32px;
  background-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B30 : colors.B98)};
  filter: drop-shadow(0px 5px 20px rgba(0, 0, 0, 0.1));
  border-radius: 8px;
`;

const Title = styled.p`
  margin: 0;
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.white : colors.B30)};
  font-size: 24px;
  font-weight: 700;
`;

const Description = styled.p`
  margin: 12px 0 0 0;
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B80 : colors.B60)};
  font-size: 16px;
`;

const ButtonsHolder = styled.div`
  display: flex;
  gap: 28px;
  margin-top: 24px;
`;

const DotsNavigationStyled = styled(DotsNavigation)`
  margin-top: 24px;
  align-self: center;
`;

export const DigestWorkflowTourTooltip = ({
  tooltipProps,
  primaryProps,
  skipProps,
  isLastStep,
  index,
  size,
}: TooltipRenderProps) => {
  const { setSelectedNodeId } = useTemplateEditorContext();
  const { watch } = useFormContext<IForm>();
  const steps = watch('steps');
  const { stopTour, setStep } = useTour();

  const Icon = ICONS[index];

  const handleOnClick = (tourStepIndex: number) => {
    if (tourStepIndex === 0) {
      const digestStep = steps.find((el) => el.template?.type === StepTypeEnum.DIGEST);
      setStep(tourStepIndex);
      setSelectedNodeId(digestStep?.id || '');
    }
    if (tourStepIndex === 1) {
      const emailStep = steps.find((el) => el.template?.type === StepTypeEnum.EMAIL);
      setStep(tourStepIndex);
      setSelectedNodeId(emailStep?.id || '');
    }
    if (tourStepIndex === 2) {
      setStep(tourStepIndex);
      setSelectedNodeId('');
    }
  };

  return (
    <TooltipHolder ref={tooltipProps.ref} data-test-id="digest-workflow-tooltip">
      <Icon width={120} height={120} style={{ alignSelf: 'center', marginTop: '40px', marginBottom: '40px' }} />
      <Title>{TITLE[index]}</Title>
      <Description>{DESCRIPTION[index]}</Description>
      <ButtonsHolder>
        <Button
          {...primaryProps}
          onClick={() => {
            if (isLastStep) {
              stopTour();

              return;
            }

            handleOnClick(index + 1);
          }}
          data-test-id="digest-workflow-tooltip-primary-button"
        >
          {primaryProps.title}
        </Button>
        {!isLastStep && (
          <UnstyledButton {...skipProps} data-test-id="digest-workflow-tooltip-skip-button">
            {skipProps.title}
          </UnstyledButton>
        )}
      </ButtonsHolder>
      <DotsNavigationStyled
        selectedIndex={index}
        size={size}
        onClick={(num) => {
          if (num === index) return;

          handleOnClick(num);
        }}
        testId="digest-workflow-tooltip-dots-navigation"
      />
    </TooltipHolder>
  );
};
