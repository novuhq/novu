import { ActionIcon, Divider, Group, ScrollArea } from '@mantine/core';
import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useParams } from 'react-router-dom';

import { useEnvController, useGetPrimaryIntegration, useHasActiveIntegrations } from '../../../hooks';
import { getFormattedStepErrors, getVariantErrors } from '../shared/errors';
import { FloatingButton } from './FloatingButton';
import { IForm } from './formTypes';
import { useTemplateEditorForm } from './TemplateEditorFormProvider';
import { VariantItemCard } from './VariantItemCard';
import { VariantsListSidebar } from './VariantsListSidebar';

import styled from '@emotion/styled';
import { ChevronPlainDown, colors, ErrorIcon, Text } from '@novu/design-system';
import { When } from '../../../components/utils/When';

export function VariantsPage() {
  const {
    watch,
    formState: { errors },
  } = useFormContext<IForm>();
  const { channel, stepUuid = '' } = useParams<{
    channel: StepTypeEnum | undefined;
    stepUuid: string;
  }>();
  const { readonly: isReadonly } = useEnvController();
  const { isLoading } = useTemplateEditorForm();
  const viewport = useRef<HTMLDivElement | null>(null);
  const [scrollPosition, setScrollPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isScrollable, setScrollable] = useState(false);
  const [errorState, setErrorState] = useState<{
    variantIndex: number;
    errorMessage: string;
    currentErrorIndex: number;
    variantErrorsIndex: number;
  } | null>(null);

  const steps = watch('steps');

  const stepIndex = useMemo(
    () => steps.findIndex((message) => message.template.type === channel && message.uuid === stepUuid),
    [channel, stepUuid, steps]
  );
  const step = watch(`steps.${stepIndex}`);

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

  const { hasActiveIntegration, isChannelStep, activeIntegrationsByEnv } = useHasActiveIntegrations({
    filterByEnv: true,
    channelType: channel as unknown as ChannelTypeEnum,
  });
  const { primaryIntegration, isPrimaryStep } = useGetPrimaryIntegration({
    filterByEnv: true,
    channelType: channel as unknown as ChannelTypeEnum,
  });

  const missingProviderError = useMemo(() => {
    if (!hasActiveIntegration && channel) {
      return `Provider is missing`;
    }

    if (isPrimaryStep && !primaryIntegration) {
      return 'Select primary provider';
    }

    return null;
  }, [hasActiveIntegration, channel, isPrimaryStep, primaryIntegration]);

  const { variantsErrors, variantErrorsCount, variantsErrorMap } = useMemo(() => {
    const rootVariantIndex = variants.length;
    const errorData = missingProviderError ? [{ variantIndex: rootVariantIndex, errorMsg: missingProviderError }] : [];
    const rootStepErrors = getFormattedStepErrors(stepIndex, errors);

    if (rootStepErrors) {
      errorData.push({
        variantIndex: rootVariantIndex,
        errorMsg: rootStepErrors,
      });
    }

    const variantErrors = getVariantErrors(stepIndex, errors);
    if (variantErrors && variantErrors.length > 0) {
      errorData.push(...getVariantErrors(stepIndex, errors));
    }

    const errorMap = errorData?.reduce<Record<string, string>>((acc, error) => {
      acc[`variant-${error.variantIndex}`] = error.errorMsg;

      return acc;
    }, {});

    const errorsCount = Object.keys(errorData ?? {}).length;

    return {
      variantsErrors: errorData,
      variantsErrorMap: errorMap,
      variantErrorsCount: errorsCount,
    };
  }, [variants.length, missingProviderError, stepIndex, errors]);

  useEffect(() => {
    if (variantsErrors?.length > 0) {
      setErrorState({
        variantIndex: variantsErrors[0].variantIndex,
        errorMessage: variantsErrors[0].errorMsg,
        currentErrorIndex: 1,
        variantErrorsIndex: 0,
      });
    } else {
      setErrorState(null);
    }
  }, [variantsErrors]);

  if (!channel) {
    return null;
  }

  const handleErrorNavigation = (direction: 'up' | 'down') => {
    if (!errorState || !variantsErrors || !variantsErrorMap) {
      return;
    }

    const { currentErrorIndex, variantErrorsIndex } = errorState;
    const nextErrorIndex = direction === 'up' ? variantErrorsIndex - 1 : variantErrorsIndex + 1;

    if (nextErrorIndex < 0 || nextErrorIndex >= variantErrorsCount) {
      return;
    }

    const nextVariantIndex = variantsErrors[nextErrorIndex].variantIndex;

    setErrorState({
      variantIndex: nextVariantIndex,
      errorMessage: variantsErrors[nextErrorIndex].errorMsg,
      currentErrorIndex: currentErrorIndex + (direction === 'up' ? -1 : 1),
      variantErrorsIndex: nextErrorIndex,
    });
  };

  return (
    <VariantsListSidebar isLoading={isLoading}>
      <When truthy={errorState}>
        <Group position="apart" px={12}>
          <Group position="left" spacing={4}>
            <ErrorIcon color={colors.error} width="16px" height="16px" />
            <Text color={colors.error}>{errorState?.errorMessage}</Text>
          </Group>
          <Group position="left" spacing={20}>
            <Text color={colors.error}>
              {errorState?.currentErrorIndex}/{variantErrorsCount}
            </Text>
            <Divider orientation="vertical" size="sm" color="#ffffff33" />
            <ActionIcon color="gray" radius="xl" size="xs" onClick={() => handleErrorNavigation('up')}>
              <ChevronPlainUp color={colors.error} />
            </ActionIcon>
            <ActionIcon color="gray" radius="xl" size="xs" onClick={() => handleErrorNavigation('down')}>
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
        {variants?.map((variant, variantIndex) => {
          const isActiveError = errorState?.variantIndex === variantIndex;
          const errorMessage = isActiveError ? errorState.errorMessage : variantsErrorMap?.[`variant-${variantIndex}`];

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
        {step && variants.length > 0 && (
          <VariantItemCard
            isReadonly={isReadonly}
            key={stepUuid}
            variant={step}
            nodeType="variantRoot"
            data-test-id="variant-root-card"
            errorMessage={
              errorState?.variantIndex === variants.length
                ? errorState.errorMessage
                : missingProviderError ?? variantsErrorMap?.[`variant-${variants.length}`]
            }
            isActiveError={errorState?.variantIndex === variants.length}
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
