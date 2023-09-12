import { Group } from '@mantine/core';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useParams } from 'react-router-dom';

import { StepTypeEnum } from '@novu/shared';

import { Button } from '../../../../design-system';
import type { IForm } from '../../components/formTypes';
import { StepActiveSwitch } from '../StepActiveSwitch';
import { useEnvController } from '../../../../hooks';
import { ShouldStopOnFailSwitch } from '../ShouldStopOnFailSwitch';
import { ReplyCallback, ReplyCallbackSwitch } from '../ReplyCallback';
import { When } from '../../../../components/utils/When';
import { FilterModal } from '../../filter/FilterModal';
import { FilterGradient, Filter } from '../../../../design-system/icons';
import { FilterOutlined } from '../../../../design-system/icons/gradient/FilterOutlined';

export function StepSettings({ index }: { index: number }) {
  const { readonly } = useEnvController();
  const { control, watch, setValue } = useFormContext<IForm>();
  const [filterOpen, setFilterOpen] = useState(false);
  const { channel } = useParams<{
    channel: StepTypeEnum;
  }>();
  const [filterHover, setFilterHover] = useState(false);

  const filters = watch(`steps.${index}.filters.0.children`);

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
          <When truthy={filters && filters?.length === 0}>
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
      <FilterModal
        isOpen={filterOpen}
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
