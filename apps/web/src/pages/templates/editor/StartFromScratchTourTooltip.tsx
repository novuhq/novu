import { Group, Stack, UnstyledButton } from '@mantine/core';
import styled from '@emotion/styled';
import { TooltipRenderProps } from 'react-joyride';
import { useFormContext } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { StepTypeEnum } from '@novu/shared';

import { useTour } from './TourProvider';
import { Button, colors, DotsNavigation } from '../../../design-system';
import { Clock, LetterOpened, BellWithNotification } from '../../../design-system/icons';
import { IForm } from '../components/formTypes';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { DigestWorkflowTourAnalyticsEnum, HINT_INDEX_TO_CLICK_ANALYTICS, ordinalNumbers } from '../constants';
import { useBasePath } from '../hooks/useBasePath';
import { useTourStorage } from '../hooks/useTourStorage';

const ICONS = [Clock, LetterOpened, BellWithNotification];
const TITLE = [
  'Discover a quick guide',
  'Click to edit workflow name',
  'Verify workflow settings',
  'Build a notification workflow',
  'Run a test or Get Snippet',
];
const DESCRIPTION = [
  'Four simple tips to become a workflow expert.',
  'Specify a name for your workflow here or in the workflow settings.',
  'Manage name, identifier, group and description. Set up channels, active by default.',
  'Add channels you would like to send notifications to. The channels will be inserted to the trigger snippet.',
  'Test a trigger as if it was sent from your API. Deploy it to your App by copy/paste trigger snippet.',
];

const TooltipHolder = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 400px;
  width: 340px;
  padding: 24px;
  background-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B30 : colors.B98)};
  filter: drop-shadow(0px 5px 20px rgba(0, 0, 0, 0.1));
  border-radius: 8px;
`;

const Title = styled.p`
  margin: 0;
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.white : colors.B30)};
  font-size: 18px;
  line-height: 24px;
  font-weight: 700;
`;

const Description = styled.p`
  margin: 0;
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B80 : colors.B60)};
  font-size: 16px;
  line-height: 20px;
`;

const ButtonsHolder = styled.div`
  display: flex;
  justify-content: space-between;
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

export const StartFromScratchTourTooltip = ({
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
    /*
     * if (tourStepIndex === 0) {
     *   const digestStep = steps.find((el) => el.template?.type === StepTypeEnum.DIGEST);
     *   navigate(basePath + '/' + StepTypeEnum.DIGEST + '/' + digestStep?.uuid);
     * } else if (tourStepIndex === 1) {
     *   const emailStep = steps.find((el) => el.template?.type === StepTypeEnum.EMAIL);
     *   navigate(basePath + '/' + StepTypeEnum.EMAIL + '/' + emailStep?.uuid);
     * } else if (tourStepIndex === 2) {
     *   navigate(basePath + '/test-workflow');
     * }
     */
    tourStorage.setTour('scratch', templateId, tourStepIndex);
    setStep(tourStepIndex);

    const stepIndex = isFromNavigation ? tourStepIndex : index;
    const analyticsEvent = getAnalyticsEvent(stepIndex, isFromNavigation);

    if (analyticsEvent) {
      segment.track(analyticsEvent, { when: ordinalNumbers[stepIndex] });
    }
  };

  const stopTourCallback = () => {
    stopTour();
    tourStorage.deleteTour('scratch', templateId);
  };

  const handleSkipClick = () => {
    segment.track(DigestWorkflowTourAnalyticsEnum.HINT_SKIP_TOUR_CLICK, { when: ordinalNumbers[index] });
    stopTourCallback();
  };

  return (
    <TooltipHolder ref={tooltipProps.ref} data-test-id="digest-workflow-tooltip">
      <Group spacing={20} noWrap>
        <Icon width={64} height={64} style={{ alignSelf: 'center' }} />
        <Stack spacing={8}>
          <Title>{TITLE[index]}</Title>
          <Description>{DESCRIPTION[index]}</Description>
        </Stack>
      </Group>
      <ButtonsHolder>
        {!isLastStep && (
          <UnstyledButton {...skipProps} onClick={handleSkipClick} data-test-id="digest-workflow-tooltip-skip-button">
            {skipProps.title}
          </UnstyledButton>
        )}

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
