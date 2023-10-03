import { Group, ActionIcon, Center } from '@mantine/core';
import React, { useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useParams } from 'react-router-dom';

import { ChannelTypeEnum, FILTER_TO_LABEL, FilterPartTypeEnum, StepTypeEnum } from '@novu/shared';

import type { IForm } from './formTypes';
import { channels } from '../../../utils/channels';
import { Conditions, DataSelect, IConditions, IFilterTypeList } from '../../../components/conditions';
import { When } from '../../../components/utils/When';
import { Condition, ConditionPlus, ConditionsFile } from '../../../design-system/icons';
import { colors, Text, Tooltip } from '../../../design-system';

export function ConditionsSettings({
  index,
  variantIndex,
  root = false,
}: {
  index: number;
  variantIndex?: number;
  root?: boolean;
}) {
  const { control, watch, setValue, getValues } = useFormContext<IForm>();
  const [filterOpen, setFilterOpen] = useState(false);
  const steps = useWatch({ name: 'steps', control });

  const path = variantIndex ? `steps.${index}.variants.${variantIndex}` : `steps.${index}`;
  const filters = watch(`${path}.filters.0.children` as any);

  const PlusIcon = root ? ConditionsFile : ConditionPlus;
  const ConditionsIcon = root ? ConditionsFile : Condition;

  const FilterPartTypeList = useMemo(() => {
    const filterPartList: IFilterTypeList[] = [
      { value: FilterPartTypeEnum.PAYLOAD, label: FILTER_TO_LABEL[FilterPartTypeEnum.PAYLOAD] },
      {
        value: FilterPartTypeEnum.SUBSCRIBER,
        label: FILTER_TO_LABEL[FilterPartTypeEnum.SUBSCRIBER],
      },
      { value: FilterPartTypeEnum.WEBHOOK, label: FILTER_TO_LABEL[FilterPartTypeEnum.WEBHOOK] },
      { value: FilterPartTypeEnum.IS_ONLINE, label: FILTER_TO_LABEL[FilterPartTypeEnum.IS_ONLINE] },
      {
        value: FilterPartTypeEnum.IS_ONLINE_IN_LAST,
        label: FILTER_TO_LABEL[FilterPartTypeEnum.IS_ONLINE_IN_LAST],
      },
    ];

    if (steps.length < 2) {
      return filterPartList;
    }

    const stepsBeforeSelectedStep = steps.slice(0, index);
    const selectableSteps = stepsBeforeSelectedStep.filter((step) => {
      return [ChannelTypeEnum.EMAIL, ChannelTypeEnum.IN_APP].includes(step.template.type as unknown as ChannelTypeEnum);
    });

    if (selectableSteps.length === 0) {
      return filterPartList;
    }

    const data = selectableSteps.map((item) => {
      const label = channels.find((channel) => channel.channelType === item.template.type)?.label;

      return {
        label: item.name ?? label,
        value: item.uuid,
      };
    }) as DataSelect[];

    filterPartList.push({
      value: FilterPartTypeEnum.PREVIOUS_STEP,
      label: FILTER_TO_LABEL[FilterPartTypeEnum.PREVIOUS_STEP],
      data,
    });

    return filterPartList;
  }, [steps, index]);

  const updateConditions = (conditions: IConditions[]) => {
    setValue(`${path}.filters` as any, conditions, { shouldDirty: true });
  };

  if (filterOpen) {
    const [conditions, name] = getValues([`${path}.filters` as any, `${path}.name` as any]);

    return (
      <Conditions
        isOpened={filterOpen}
        name={name || ''}
        onClose={() => {
          setFilterOpen(false);
        }}
        updateConditions={updateConditions}
        conditions={conditions}
        filterPartsList={FilterPartTypeList}
        defaultFilter={FilterPartTypeEnum.PAYLOAD}
      />
    );
  }

  return (
    <div style={{ color: colors.B60 }}>
      <When truthy={(filters && filters?.length === 0) || !filters}>
        <Tooltip label={`Add ${root ? 'group' : ''} conditions`}>
          <ActionIcon
            variant="transparent"
            onClick={(e) => {
              e.stopPropagation();
              setFilterOpen(true);
            }}
          >
            <PlusIcon width="20px" height="20px" color={colors.B60} />
          </ActionIcon>
        </Tooltip>
      </When>
      <When truthy={filters && filters?.length > 0}>
        <Tooltip label={`Edit ${root ? 'group' : ''} conditions`}>
          <ActionIcon
            variant={'transparent'}
            onClick={(e) => {
              e.stopPropagation();
              setFilterOpen(true);
            }}
          >
            <Center inline>
              <ConditionsIcon color={colors.B60} width="20px" height="20px" />
              <Text ml={2} size={16} weight={'bold'} color={colors.B60}>
                {filters?.length || ''}
              </Text>
            </Center>
          </ActionIcon>
        </Tooltip>
      </When>
    </div>
  );
}
