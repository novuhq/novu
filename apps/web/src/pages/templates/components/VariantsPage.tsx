import { ActionIcon, Divider, Group, ScrollArea } from '@mantine/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import styled from '@emotion/styled';
import { StepTypeEnum, DELAYED_STEPS } from '@novu/shared';
import { ChevronPlainDown, colors, ErrorIcon, Text } from '@novu/design-system';

import { useEnvController } from '../../../hooks';
import { FloatingButton } from './FloatingButton';
import { IForm } from './formTypes';
import { useTemplateEditorForm } from './TemplateEditorFormProvider';
import { VariantItemCard } from './VariantItemCard';
import { VariantsListSidebar } from './VariantsListSidebar';
import { When } from '../../../components/utils/When';
import { NODE_ERROR_TYPES } from '../workflow/workflow/node-types/utils';
import { useBasePath } from '../hooks/useBasePath';
import { ItemTypeEnum, useVariantListErrors } from './useVariantListErrors';

export function VariantsPage() {
  const navigate = useNavigate();
  const basePath = useBasePath();
  const { watch } = useFormContext<IForm>();
  const { channel, stepUuid = '' } = useParams<{
    channel: StepTypeEnum;
    stepUuid: string;
  }>();
  const { readonly: isReadonly } = useEnvController();
  const { isLoading } = useTemplateEditorForm();
  const viewport = useRef<HTMLDivElement | null>(null);
  const [scrollPosition, setScrollPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isScrollable, setScrollable] = useState(false);
  const [errorState, setErrorState] = useState<{
    itemType: ItemTypeEnum;
    variantIndex?: number;
    errorMessage: string;
    errorIndex: number;
    errorType: NODE_ERROR_TYPES;
  } | null>(null);

  const steps = watch('steps');

  const stepIndex = useMemo(
    () => steps.findIndex((message) => message.template.type === channel && message.uuid === stepUuid),
    [channel, stepUuid, steps]
  );
  const step = watch(`steps.${stepIndex}`);
  const isDelayedStep = DELAYED_STEPS.includes(channel as StepTypeEnum);

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

  const variants = step?.variants ?? [];

  const allErrors = useVariantListErrors();

  useEffect(() => {
    if (allErrors.errors.length > 0) {
      const firstError = allErrors.errors[0];
      setErrorState({
        ...firstError,
        errorIndex: 0,
      });
    } else {
      setErrorState(null);
    }
  }, [allErrors]);

  if (!channel) {
    return null;
  }

  if (isDelayedStep) {
    navigate(`${basePath}/${channel}/${stepUuid}`);
  }

  const handleErrorNavigation = (direction: 'up' | 'down') => {
    const hasErrors = allErrors.errors.length > 0;
    if (!errorState || !hasErrors) {
      return;
    }

    const { errorIndex } = errorState;
    const nextErrorIndex = direction === 'up' ? errorIndex - 1 : errorIndex + 1;

    if (nextErrorIndex < 0 || nextErrorIndex >= allErrors.errors.length) {
      return;
    }

    const error = allErrors.errors[nextErrorIndex];

    setErrorState({
      variantIndex: error.variantIndex,
      errorMessage: error.errorMessage,
      itemType: error.itemType,
      errorIndex: nextErrorIndex,
      errorType: error.errorType,
    });
  };

  const isRootErrorActive = errorState?.itemType === ItemTypeEnum.ROOT;

  return (
    <VariantsListSidebar isLoading={isLoading}>
      <When truthy={errorState}>
        <Group position="apart" px={12}>
          <Group position="left" spacing={4}>
            <ErrorIcon color={colors.error} width="16px" height="16px" />
            <Text color={colors.error} data-test-id="variants-list-current-error">
              {errorState?.errorMessage}
            </Text>
          </Group>
          <Group position="left" spacing={20}>
            <Text color={colors.error} data-test-id="variants-list-errors-count">
              {(errorState?.errorIndex ?? 0) + 1}/{allErrors.errors.length}
            </Text>
            <Divider orientation="vertical" size="sm" color="#ffffff33" />
            <ActionIcon
              color="gray"
              radius="xl"
              size="xs"
              onClick={() => handleErrorNavigation('up')}
              data-test-id="variants-list-errors-up"
            >
              <ChevronPlainUp color={colors.error} />
            </ActionIcon>
            <ActionIcon
              color="gray"
              radius="xl"
              size="xs"
              onClick={() => handleErrorNavigation('down')}
              data-test-id="variants-list-errors-down"
            >
              <ChevronPlainDown color={colors.error} />
            </ActionIcon>
          </Group>
        </Group>
      </When>
      <ScrollArea
        key={stepUuid}
        offsetScrollbars
        styles={{ viewport: { padding: '0 12px 24px 12px' } }}
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
              isActiveError={isActiveError}
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
            isActiveError={isRootErrorActive}
            nodeErrorType={isRootErrorActive ? errorState.errorType : undefined}
          />
        )}
        {isScrollable && <FloatingButton isUp={scrollPosition.y > 0} onClick={scrollTo} />}
      </ScrollArea>
    </VariantsListSidebar>
  );
}

const ChevronPlainUp = styled(ChevronPlainDown)`
  transform: rotate(180deg);
`;
