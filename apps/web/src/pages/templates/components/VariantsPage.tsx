import { useMemo, useRef, useState } from 'react';
import { ScrollArea } from '@mantine/core';
import { useFormContext } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { StepTypeEnum } from '@novu/shared';

import { VariantItemCard } from './VariantItemCard';
import { VariantsListSidebar } from './VariantsListSidebar';
import { IForm } from './formTypes';
import { FloatingButton } from './FloatingButton';

export function VariantsPage() {
  const { watch } = useFormContext<IForm>();
  const { channel, stepUuid = '' } = useParams<{
    channel: StepTypeEnum | undefined;
    stepUuid: string;
  }>();
  const viewport = useRef<HTMLDivElement | null>(null);
  const [scrollPosition, setScrollPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isScrollable, setScrollable] = useState(false);

  const steps = watch('steps');

  const index = useMemo(
    () => steps.findIndex((message) => message.template.type === channel && message.uuid === stepUuid),
    [channel, stepUuid, steps]
  );
  const step = watch(`steps.${index}`);

  const setViewportRef = (ref: HTMLDivElement | null) => {
    if (!ref) {
      return;
    }
    viewport.current = ref;
    setScrollable(ref.scrollHeight > ref.clientHeight);
  };

  const scrollTo = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!viewport.current) {
      return;
    }

    viewport.current.scrollTo({ top: scrollPosition.y > 0 ? 0 : viewport.current.scrollHeight, behavior: 'smooth' });
  };

  if (!channel) {
    return null;
  }

  const { variants } = step;

  return (
    <VariantsListSidebar variantsCount={variants?.length ?? 0}>
      <ScrollArea
        key={stepUuid}
        offsetScrollbars
        styles={{ viewport: { padding: '0 12px 24px 12px' } }}
        viewportRef={setViewportRef}
        onScrollPositionChange={setScrollPosition}
      >
        {variants?.map((variant, idx) => {
          return (
            <VariantItemCard
              key={`${stepUuid}_${variant._id}`}
              isFirst={idx === 0}
              variant={variant}
              nodeType="variant"
            />
          );
        })}
        <VariantItemCard key={stepUuid} variant={step} nodeType="variantRoot" />
        {isScrollable && <FloatingButton isUp={scrollPosition.y > 0} onClick={scrollTo} />}
      </ScrollArea>
    </VariantsListSidebar>
  );
}
