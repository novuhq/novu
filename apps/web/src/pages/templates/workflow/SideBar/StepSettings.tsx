import { Group } from '@mantine/core';
import { useFormContext } from 'react-hook-form';

import { Button } from '../../../../design-system';
import type { IForm } from '../../components/formTypes';
import { StepActiveSwitch } from '../StepActiveSwitch';
import { useEnvController } from '../../../../hooks';
import { ShouldStopOnFailSwitch } from '../ShouldStopOnFailSwitch';
import { ReplyCallback, ReplyCallbackSwitch } from '../ReplyCallback';
import { useParams } from 'react-router-dom';
import { StepTypeEnum } from '@novu/shared';
import { When } from '../../../../components/utils/When';
import { FilterModal } from '../../filter/FilterModal';
import { useState } from 'react';
import { Filter } from '../../../../design-system/icons/actions/Filter';

export function StepSettings({ index }: { index: number }) {
  const { readonly } = useEnvController();
  const { control } = useFormContext<IForm>();
  const [filterOpen, setFilterOpen] = useState(false);

  const { channel } = useParams<{
    channel: StepTypeEnum;
  }>();

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
        >
          <Filter
            style={{
              marginRight: '7px',
            }}
          />
          Add filter
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
      />
    </>
  );
}
