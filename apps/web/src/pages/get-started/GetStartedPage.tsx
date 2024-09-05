import { useCallback, useEffect } from 'react';
import { css } from '@novu/novui/css';
import { Stepper, Group } from '@mantine/core';

import { Title, Button } from '@novu/novui';
import { useLocalStorage } from '@mantine/hooks';
import { motion } from 'framer-motion';
import { PageContainer } from '../../studio/layout/PageContainer';
import { OnboardingStepsTimeline } from './OnboardingSteps';
import { stepperClassNames } from './GetStartedPage.styles';
import { onboardingTabs } from './form-tabs.config';
import { useSegment } from '../../components/providers/SegmentProvider';
import { navigatePlayground } from '../../utils';
import { OutlineButton } from '../../studio/components/OutlineButton';
import { When } from '../../components/utils/When';
import { useWebContainerSupported } from '../../hooks/useWebContainerSupport';

const PAGE_TITLE = 'Get started with the Novu Flow';

export function GetStartedPage() {
  const segment = useSegment();
  const { isSupported } = useWebContainerSupported();

  useEffect(() => {
    segment.track('Page visit - [Get Started]');
  }, [segment]);

  const handleClick = () => {
    segment.track('Click visit playground - [Get Started]');
    navigatePlayground();
  };

  return (
    <PageContainer className={css({ overflowY: 'auto' })}>
      <div
        className={css({
          maxWidth: '1000px',
          margin: '0 auto !important',
          width: '100%',
        })}
      >
        <div
          className={css({
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '34px',
          })}
        >
          <Title className={css({ fontWeight: 'bold' })}>{PAGE_TITLE}</Title>
          <When truthy={isSupported}>
            <OutlineButton onClick={handleClick}>Visit playground</OutlineButton>
          </When>
        </div>
        <StepperForm />
      </div>
    </PageContainer>
  );
}

function StepperForm() {
  const segment = useSegment();

  const [active, setActive] = useLocalStorage({
    key: 'nv-get-started-active-step',
    defaultValue: 0,
  });

  const nextStep = () => {
    setActive((current) => {
      const newStep = current < 2 ? current + 1 : current;
      segment.track('Get Started - Page Tab Navigate', { from: current, to: newStep });

      return newStep;
    });
  };

  const prevStep = () => {
    setActive((current) => {
      const newStep = current > 0 ? current - 1 : current;
      segment.track('Get Started - Page Tab Navigate', { from: current, to: newStep });

      return newStep;
    });
  };

  return (
    <>
      <Stepper active={active} onStepClick={setActive} classNames={stepperClassNames} orientation="vertical">
        {onboardingTabs.map((tab, index) => (
          <Stepper.Step
            key={index}
            description={tab.description}
            icon={
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                {tab.icon}
              </motion.div>
            }
            label={tab.stepperTitle}
            onClick={() => setActive(index)}
          >
            {tab.content}

            {tab.steps && <OnboardingStepsTimeline steps={tab.steps} />}
            <Group position="apart" mt="xl">
              <Button disabled={active === 0} onClick={prevStep} variant="transparent">
                Back
              </Button>

              {active !== onboardingTabs.length - 1 && (
                <Button onClick={nextStep} variant="filled" disabled={active === 2}>
                  Next step
                </Button>
              )}
            </Group>
          </Stepper.Step>
        ))}
      </Stepper>
    </>
  );
}
