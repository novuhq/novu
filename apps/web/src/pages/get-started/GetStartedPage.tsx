import { useSegment } from '../../components/providers/SegmentProvider';
import { useEffect } from 'react';
import { css } from '@novu/novui/css';
import { Stepper, Group } from '@mantine/core';

import { PageContainer } from '../../studio/layout/PageContainer';
import { Title, Button } from '@novu/novui';
import { useLocalStorage } from '@mantine/hooks';
import { OnboardingStepsTimeline } from './OnboardingSteps';
import { stepperClassNames } from './GetStartedPage.styles';
import { onboardingTabs } from './form-tabs.config';
import { motion } from 'framer-motion';
const PAGE_TITLE = 'Get started with the Novu Flow';

export function GetStartedPage() {
  const segment = useSegment();

  useEffect(() => {
    segment.track('Page visit - [Get Started]');
  }, [segment]);

  return (
    <PageContainer>
      <div
        className={css({
          paddingLeft: '64px',
          paddingRight: '64px',
          maxWidth: '880px',
          margin: '0 auto !important',
          width: '100%',
        })}
      >
        <Title className={css({ fontWeight: 'bold', marginBottom: '34px' })}>{PAGE_TITLE}</Title>
        <StepperForm />
      </div>
    </PageContainer>
  );
}

function StepperForm() {
  const [active, setActive] = useLocalStorage({
    key: 'nv-get-started-active-step',
    defaultValue: 0,
  });

  const nextStep = () => setActive((current) => (current < 2 ? current + 1 : current));
  const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));

  return (
    <>
      <Stepper active={active} onStepClick={setActive} classNames={stepperClassNames}>
        {onboardingTabs.map((tab, index) => (
          <Stepper.Step
            key={index}
            icon={
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                {tab.icon}
              </motion.div>
            }
            label={tab.stepperTitle}
            onClick={() => setActive(index)}
          >
            <Title
              className={css({
                fontWeight: 'bold',
                marginBottom: 'margins.layout.page.section.titleBottom',
                fontSize: '20px',
                color: 'typography.text.secondary',
              })}
            >
              {tab.title}
            </Title>
            {tab.content}

            {tab.steps && <OnboardingStepsTimeline steps={tab.steps} />}
          </Stepper.Step>
        ))}
      </Stepper>

      <Group position="apart" mt="xl">
        <Button disabled={active === 0} onClick={prevStep} variant="transparent">
          Back
        </Button>

        {active !== 2 && (
          <Button onClick={nextStep} variant="filled" disabled={active === 2}>
            Next step
          </Button>
        )}
      </Group>
    </>
  );
}
