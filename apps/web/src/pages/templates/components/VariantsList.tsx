import { useMemo, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { useFormContext } from 'react-hook-form';
import { ScrollArea } from '@mantine/core';
import { useParams } from 'react-router-dom';
import { useEnvController } from '@novu/shared-web';
import { StepTypeEnum } from '@novu/shared';

import { FloatingButton } from './FloatingButton';
import { VariantItemCard } from './VariantItemCard';
import { ItemTypeEnum } from './useVariantListErrors';
import { IForm } from './formTypes';
import { VariantsListErrors } from './VariantsListErrors';
import { When } from '@novu/design-system';
import { useVariantListErrorsNavigation } from './useVariantListErrorsNavigation';

const LeftContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

export const VariantsList = () => {
  const { channel, stepUuid = '' } = useParams<{
    channel: StepTypeEnum;
    stepUuid: string;
  }>();
  const { readonly: isReadonly } = useEnvController();
  const { watch } = useFormContext<IForm>();
  const viewport = useRef<HTMLDivElement | null>(null);
  const [scrollPosition, setScrollPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isScrollable, setScrollable] = useState(false);

  const steps = watch('steps');
  const stepIndex = useMemo(
    () => steps.findIndex((message) => message.template.type === channel && message.uuid === stepUuid),
    [channel, stepUuid, steps]
  );
  const step = watch(`steps.${stepIndex}`);
  const variants = step?.variants ?? [];

  const { allErrors, errorState, onErrorUp, onErrorDown, onErrorMessageClick } = useVariantListErrorsNavigation();
  const isRootErrorActive = errorState?.itemType === ItemTypeEnum.ROOT;
  const allErrorsCount = allErrors.errors.length;
  const hasErrors = allErrorsCount > 0;

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

  return (
    <LeftContainer>
      <When truthy={hasErrors}>
        <VariantsListErrors
          error={{ errorIndex: errorState?.errorIndex, errorMessage: errorState?.errorMessage }}
          errorsCount={allErrorsCount}
          onErrorMessageClick={onErrorMessageClick}
          onErrorUp={onErrorUp}
          onErrorDown={onErrorDown}
        />
      </When>
      <ScrollArea
        key={stepUuid}
        offsetScrollbars
        styles={{ viewport: { padding: '0 1.5rem 1.5rem 0.75rem' } }}
        viewportRef={setViewportRef}
        onScrollPositionChange={setScrollPosition}
      >
        {[...variants].reverse().map((variant, idx) => {
          const variantIndex = variants.length - idx - 1;
          const isActiveError = errorState?.variantIndex === variantIndex;
          const errorMessage = isActiveError ? errorState.errorMessage : allErrors.errorsMap[`variant-${variantIndex}`];

          return (
            <VariantItemCard
              key={`${stepUuid}_${variant._id}`}
              isReadonly={isReadonly}
              isFirst={variantIndex === 0}
              variant={variant}
              stepIndex={stepIndex}
              variantIndex={variantIndex}
              nodeType="variant"
              data-test-id={`variant-item-card-${variantIndex}`}
              errorMessage={errorMessage}
            />
          );
        })}
        {step && (
          <VariantItemCard
            isReadonly={isReadonly}
            key={stepUuid}
            variant={step}
            nodeType="variantRoot"
            data-test-id="variant-root-card"
            errorMessage={isRootErrorActive ? errorState.errorMessage : allErrors.errorsMap.root}
            nodeErrorType={isRootErrorActive ? errorState.errorType : undefined}
          />
        )}
        {isScrollable && <FloatingButton isUp={scrollPosition.y > 0} onClick={scrollTo} />}
      </ScrollArea>
    </LeftContainer>
  );
};
