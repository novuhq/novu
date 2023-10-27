import { UnstyledButton } from '@mantine/core';
import styled from '@emotion/styled';
import { TooltipRenderProps } from 'react-joyride';
import { useFormContext } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { StepTypeEnum } from '@novu/shared';

import { useTour } from './TourProvider';
import { Button, colors, DotsNavigation, Clock, LetterOpened, BellWithNotification } from '@novu/design-system';
import { IForm } from '../components/formTypes';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { DigestWorkflowTourAnalyticsEnum, HINT_INDEX_TO_CLICK_ANALYTICS, ordinalNumbers } from '../constants';
import { useBasePath } from '../hooks/useBasePath';
import { useTourStorage } from '../hooks/useTourStorage';

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
  padding: 20px;
  width: 280px;
  background-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B30 : colors.B98)};
  filter: drop-shadow(0px 5px 20px rgba(0, 0, 0, 0.1));
  border-radius: 8px;

  [data-tooltip-icon] {
    width: 80px;
    height: 80px;
    align-self: center;
    margin-top: 20px;
    margin-bottom: 20px;
  }

  @media screen and (min-width: 1440px) {
    padding: 32px;

    [data-tooltip-icon] {
      width: 120px;
      height: 120px;
      margin-top: 40px;
      margin-bottom: 40px;
    }
  }
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

const getAnalyticsEvent = (index: number, isFromNavigation: boolean): string | undefined => {
  if (isFromNavigation) {
    return DigestWorkflowTourAnalyticsEnum.NAVIGATE_HINT_CLICK;
  }

  return HINT_INDEX_TO_CLICK_ANALYTICS[index];
};

export const DigestWorkflowTourTooltip = ({
  tooltipProps,
  primaryProps,
  skipProps,
  isLastStep,
  index,
  size,
}: TooltipRenderProps) => {
  const segment = useSegment();
  const { watch } = useFormContext<IForm>();
  const steps = watch('steps');
  const { stopTour, setStep } = useTour();
  const navigate = useNavigate();
  const Icon = ICONS[index];
  const basePath = useBasePath();
  const { templateId = '' } = useParams<{ templateId: string }>();

  const tourStorage = useTourStorage();

  const handleOnClick = (tourStepIndex: number, isFromNavigation = false) => {
    if (tourStepIndex === 0) {
      const digestStep = steps.find((el) => el.template?.type === StepTypeEnum.DIGEST);
      navigate(basePath + '/' + StepTypeEnum.DIGEST + '/' + digestStep?.uuid);
    } else if (tourStepIndex === 1) {
      const emailStep = steps.find((el) => el.template?.type === StepTypeEnum.EMAIL);
      navigate(basePath + '/' + StepTypeEnum.EMAIL + '/' + emailStep?.uuid);
    } else if (tourStepIndex === 2) {
      navigate(basePath + '/test-workflow');
    }
    tourStorage.setTour('digest', templateId, tourStepIndex);
    setStep(tourStepIndex);

    const stepIndex = isFromNavigation ? tourStepIndex : index;
    const analyticsEvent = getAnalyticsEvent(stepIndex, isFromNavigation);

    if (analyticsEvent) {
      segment.track(analyticsEvent, { when: ordinalNumbers[stepIndex] });
    }
  };

  const stopTourCallback = () => {
    stopTour();
    tourStorage.deleteTour('digest', templateId);
  };

  const handleSkipClick = () => {
    segment.track(DigestWorkflowTourAnalyticsEnum.HINT_SKIP_TOUR_CLICK, { when: ordinalNumbers[index] });
    stopTourCallback();
  };

  return (
    <TooltipHolder ref={tooltipProps.ref} data-test-id="digest-workflow-tooltip">
      <Icon data-tooltip-icon />
      <Title>{TITLE[index]}</Title>
      <Description>{DESCRIPTION[index]}</Description>
      <ButtonsHolder>
        <Button
          {...primaryProps}
          onClick={() => {
            if (isLastStep) {
              segment.track(DigestWorkflowTourAnalyticsEnum.THIRD_HINT_GOT_IT_CLICK);
              stopTourCallback();

              return;
            }

            handleOnClick(index + 1);
          }}
          data-test-id="digest-workflow-tooltip-primary-button"
        >
          {primaryProps.title}
        </Button>
        {!isLastStep && (
          <UnstyledButton {...skipProps} onClick={handleSkipClick} data-test-id="digest-workflow-tooltip-skip-button">
            {skipProps.title}
          </UnstyledButton>
        )}
      </ButtonsHolder>
      <DotsNavigationStyled
        selectedIndex={index}
        size={size}
        onClick={(num) => {
          if (num === index) return;

          handleOnClick(num, true);
        }}
        testId="digest-workflow-tooltip-dots-navigation"
      />
    </TooltipHolder>
  );
};
