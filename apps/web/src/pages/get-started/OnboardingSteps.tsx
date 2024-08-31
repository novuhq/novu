import { Timeline as MantineTimeline, Button } from '@mantine/core';
import { css } from '@novu/novui/css';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useAnimate, stagger } from 'framer-motion';

export function OnboardingStepsTimeline({ steps, activeGuide }: { steps: any[]; activeGuide?: any }) {
  const { scope, itemRefs } = useStaggeredAnimation(activeGuide ? [activeGuide] : []);

  return (
    <div ref={scope}>
      <MantineTimeline
        lineWidth={1}
        bulletSize={24}
        classNames={{
          item: css({
            paddingLeft: '30px !important',
          }),
          itemTitle: css({
            fontWeight: '600 !important',
            fontSize: '14px !important',
            color: 'typography.text.main !important',
            marginBottom: '14px !important',
          }),
          itemBody: css({
            color: 'typography.text.secondary !important',
          }),
        }}
      >
        {steps?.map((step, index) => (
          <MantineTimeline.Item
            key={index}
            bullet={`${index + 1}`}
            lineVariant="dashed"
            title={step.title}
            // eslint-disable-next-line no-return-assign
            ref={(el) => ((itemRefs.current[index] as any) = el)}
          >
            <step.content />
          </MantineTimeline.Item>
        ))}
      </MantineTimeline>
    </div>
  );
}

function useStaggeredAnimation(dependencies: any[] = []) {
  const [scope, animate] = useAnimate();
  const itemRefs = useRef([]);

  useEffect(() => {
    // Reset the animation state
    itemRefs.current.forEach((item) => {
      if (item) {
        // eslint-disable-next-line no-param-reassign
        (item as any).style.opacity = '0';
        // eslint-disable-next-line no-param-reassign
        (item as any).style.transform = 'translateY(20px)';
      }
    });

    // Trigger the animation after a short delay to ensure the reset has taken effect
    const animationTimeout = setTimeout(() => {
      if (itemRefs.current.length > 0) {
        animate(itemRefs.current, { opacity: [0, 1], y: [20, 0] }, { duration: 0.3, delay: stagger(0.1) });
      }
    }, 50);

    return () => clearTimeout(animationTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate, ...dependencies]);

  return { scope, itemRefs };
}
