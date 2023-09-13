import { Group } from '@mantine/core';
import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useParams } from 'react-router-dom';

import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';

import { Button } from '../../../../design-system';
import type { IForm } from '../../components/formTypes';
import { StepActiveSwitch } from '../StepActiveSwitch';
import { useEnvController } from '../../../../hooks';
import { ShouldStopOnFailSwitch } from '../ShouldStopOnFailSwitch';
import { ReplyCallback, ReplyCallbackSwitch } from '../ReplyCallback';
import { When } from '../../../../components/utils/When';
import { Filter, FilterGradient } from '../../../../design-system/icons';
import { FilterOutlined } from '../../../../design-system/icons/gradient/FilterOutlined';
import { Conditions, ConditionsContextEnum } from '../../../../components/conditions';
import { FilterModal } from '../../filter/FilterModal';

export function StepSettings({ index }: { index: number }) {
  const { readonly } = useEnvController();
  const { control, watch, setValue, getValues } = useFormContext<IForm>();
  const [filterOpen, setFilterOpen] = useState(false);
  const { channel } = useParams<{
    channel: StepTypeEnum;
  }>();
  const [filterHover, setFilterHover] = useState(false);

  const steps = useWatch({ name: 'steps', control });
  const filters = watch(`steps.${index}.filters.0.children`);

  const stepsBeforeSelectedStep = steps.slice(0, index);
  const selectableSteps = stepsBeforeSelectedStep.filter((step: any) => {
    return [ChannelTypeEnum.EMAIL, ChannelTypeEnum.IN_APP].includes(step.template.type);
  });

  return (
    <>
      <Group position="apart" spacing={8}>
        <Group spacing={12}>
          <StepActiveSwitch index={index} control={control} />
          <ShouldStopOnFailSwitch index={index} control={control} />
          <When truthy={channel === StepTypeEnum.EMAIL}>
            <ReplyCallbackSwitch index={index} control={control} />
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

      <Conditions
        isOpened={filterOpen}
        name={getValues('name')}
        context={ConditionsContextEnum.WORKFLOW}
        onClose={() => {
          setFilterOpen(false);
        }}
        setConditions={(data) => {
          setValue(`steps.${index}.filters`, data, { shouldDirty: true });
        }}
        conditions={getValues(`steps.${index}.filters`)}
        selectableSteps={selectableSteps}
      />

      <FilterModal
        isOpen={false}
        cancel={() => {
          setFilterOpen(false);
        }}
        confirm={() => {
          setFilterOpen(false);
        }}
        control={control}
        stepIndex={index}
        setValue={setValue}
      />
    </>
  );
}
