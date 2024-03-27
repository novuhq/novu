import { Group, Stack, UnstyledButton, useMantineColorScheme } from '@mantine/core';
import { useMutation } from '@tanstack/react-query';
import { TooltipRenderProps } from 'react-joyride';
import { useNavigate, useParams } from 'react-router-dom';
import type { IResponseError, IUserEntity } from '@novu/shared';
import {
  Button,
  colors,
  Text,
  BuildWorkflow,
  Pencil,
  QuickGuide,
  RightArrow,
  RunTestBell,
  WorkflowSettings,
} from '@novu/design-system';

import { updateUserOnBoardingTour } from '../../../api/user';
import { useAuthContext } from '../../../components/providers/AuthProvider';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { When } from '../../../components/utils/When';
import { errorMessage } from '../../../utils/notifications';
import { ordinalNumbers, SCRATCH_HINT_INDEX_TO_CLICK_ANALYTICS, StartFromScratchTourAnalyticsEnum } from '../constants';
import { useBasePath } from '../hooks/useBasePath';
import { useTourStorage } from '../hooks/useTourStorage';
import { DotsNavigationStyled, NavigationItemContainer, TooltipContainer } from './StartFromScratchTourTooltip.styles';
import { useTour } from './TourProvider';

const ICONS = [QuickGuide, Pencil, WorkflowSettings, BuildWorkflow, RunTestBell];
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

const getAnalyticsEvent = (index: number): string | undefined => {
  return SCRATCH_HINT_INDEX_TO_CLICK_ANALYTICS[index];
};

export const StartFromScratchTourTooltip = ({
  tooltipProps,
  primaryProps,
  skipProps,
  isLastStep,
  index,
  size,
}: TooltipRenderProps) => {
  const { mutateAsync: updateOnBoardingTourStatus } = useMutation<
    IUserEntity,
    IResponseError,
    { showOnBoardingTour: number }
  >(({ showOnBoardingTour }) => updateUserOnBoardingTour(showOnBoardingTour), {
    onError: (err) => {
      errorMessage(err?.message);
    },
  });

  const navigate = useNavigate();
  const basePath = useBasePath();

  const { currentUser } = useAuthContext();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const segment = useSegment();
  const { stopTour, setStep } = useTour();
  const Icon = ICONS[index];
  const isFirstStep = index === 0;
  const { templateId = '' } = useParams<{ templateId: string }>();

  const tourStorage = useTourStorage();

  const handleOnClick = (tourStepIndex: number, isFromNavigation = false) => {
    if (tourStepIndex === 2) {
      navigate(basePath);
    }
    tourStorage.setTour('scratch', templateId, tourStepIndex);
    setStep(tourStepIndex);

    const stepIndex = isFromNavigation ? tourStepIndex : index;
    const analyticsEvent = getAnalyticsEvent(stepIndex);

    if (analyticsEvent) {
      segment.track(analyticsEvent, { when: ordinalNumbers[stepIndex] });
    }
  };

  const stopTourCallback = () => {
    stopTour();
    tourStorage.deleteTour('scratch', templateId);
  };

  const handleSkipClick = async () => {
    segment.track(StartFromScratchTourAnalyticsEnum.WATCH_LATER_TOUR_CLICK, { when: ordinalNumbers[index] });
    stopTourCallback();
    const currentCount = currentUser?.showOnBoardingTour || 0;
    await updateOnBoardingTourStatus({ showOnBoardingTour: currentCount + 1 || 1 });
  };
  const buttonIconProps = isFirstStep ? {} : { icon: <RightArrow />, iconPosition: 'right' as const };

  return (
    <TooltipContainer
      ref={tooltipProps.ref}
      data-test-id="scratch-workflow-tooltip"
      width={isFirstStep ? '340px' : '400px'}
    >
      <Group spacing={20} noWrap>
        <div>
          <Icon width={64} height={64} style={{ alignSelf: 'center' }} />
        </div>
        <Stack spacing={8}>
          <Text size="lg" color={isDark ? colors.white : colors.B30} data-test-id="scratch-workflow-tooltip-title">
            {TITLE[index]}
          </Text>
          <Text color={isDark ? colors.B80 : colors.B60} data-test-id="scratch-workflow-tooltip-description">
            {DESCRIPTION[index]}
          </Text>
        </Stack>
      </Group>
      <Group align="center" position={isLastStep ? 'right' : 'apart'} mt={24} noWrap spacing={0}>
        {!isLastStep && (
          <NavigationItemContainer position="flex-start">
            <UnstyledButton
              {...skipProps}
              onClick={handleSkipClick}
              data-test-id="scratch-workflow-tooltip-skip-button"
            >
              {skipProps.title}
            </UnstyledButton>
          </NavigationItemContainer>
        )}
        <When truthy={!isFirstStep}>
          <NavigationItemContainer position="center">
            <DotsNavigationStyled
              selectedIndex={index - 1}
              size={size - 1}
              onClick={(num) => {
                const adjustedNum = num + 1;
                if (adjustedNum === index) return;

                handleOnClick(adjustedNum, true);
              }}
              testId="scratch-workflow-tooltip-dots-navigation"
            />
          </NavigationItemContainer>
        </When>
        <NavigationItemContainer position="flex-end">
          <Button
            {...primaryProps}
            {...buttonIconProps}
            onClick={() => {
              if (isLastStep) {
                segment.track(StartFromScratchTourAnalyticsEnum.FIFTH_HINT_GOT_IT_CLICK, {
                  when: ordinalNumbers[index],
                });
                stopTourCallback();
                updateOnBoardingTourStatus({ showOnBoardingTour: 2 });

                return;
              }

              handleOnClick(index + 1);
            }}
            data-test-id="scratch-workflow-tooltip-primary-button"
          >
            {primaryProps.title}
          </Button>
        </NavigationItemContainer>
      </Group>
    </TooltipContainer>
  );
};
