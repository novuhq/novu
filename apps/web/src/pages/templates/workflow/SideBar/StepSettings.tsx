import { Group } from '@mantine/core';
import { useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useParams } from 'react-router-dom';

import { ChannelTypeEnum, FILTER_TO_LABEL, FilterPartTypeEnum, StepTypeEnum } from '@novu/shared';

import { Button } from '../../../../design-system';
import type { IForm } from '../../components/formTypes';
import { StepActiveSwitch } from '../StepActiveSwitch';
import { useEnvController } from '../../../../hooks';
import { ShouldStopOnFailSwitch } from '../ShouldStopOnFailSwitch';
import { ReplyCallback, ReplyCallbackSwitch } from '../ReplyCallback';
import { When } from '../../../../components/utils/When';
import { Filter, FilterGradient } from '../../../../design-system/icons';
import { FilterOutlined } from '../../../../design-system/icons/gradient/FilterOutlined';
import { Conditions, DataSelect, IConditions, IFilterTypeList } from '../../../../components/conditions';
import { channels } from '../../../../utils/channels';

export function StepSettings({ index }: { index: number }) {
  const { readonly } = useEnvController();
  const { control, watch, setValue, getValues } = useFormContext<IForm>();
  const [filterOpen, setFilterOpen] = useState(false);
  const { channel: channelType } = useParams<{
    channel: StepTypeEnum;
  }>();
  const [filterHover, setFilterHover] = useState(false);

  const steps = useWatch({ name: 'steps', control });
  const filters = watch(`steps.${index}.filters.0.children`);

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
    setValue(`steps.${index}.filters`, conditions, { shouldDirty: true });
  };

  if (filterOpen) {
    const [conditions, name] = getValues([`steps.${index}.filters`, `steps.${index}.name`]);

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
    <>
      <Group position="apart" spacing={8}>
        <Group spacing={12}>
          <When truthy={channelType !== StepTypeEnum.DIGEST && channelType !== StepTypeEnum.DELAY}>
            <StepActiveSwitch index={index} control={control} />
            <ShouldStopOnFailSwitch index={index} control={control} />
            <When truthy={channelType === StepTypeEnum.EMAIL}>
              <ReplyCallbackSwitch index={index} control={control} />
            </When>
          </When>
        </Group>
        <Button
          variant="outline"
          onClick={() => {
            setFilterOpen(true);
          }}
          disabled={readonly}
          data-test-id="add-filter-btn"
          onMouseEnter={() => {
            setFilterHover(true);
          }}
          onMouseLeave={() => {
            setFilterHover(false);
          }}
        >
          <When truthy={filters && filters?.length > 0}>
            <When truthy={filterHover}>
              <FilterGradient
                style={{
                  marginRight: '7px',
                }}
              />
            </When>
            <When truthy={!filterHover}>
              <FilterOutlined
                style={{
                  marginRight: '7px',
                }}
              />
            </When>
            {filters?.length} filter{filters && filters?.length < 2 ? '' : 's'}
          </When>
          <When truthy={(filters && filters?.length === 0) || !filters}>
            <Filter
              style={{
                marginRight: '7px',
              }}
            />
            Add filter
          </When>
        </Button>
      </Group>
      <ReplyCallback index={index} control={control} />
    </>
  );
}
