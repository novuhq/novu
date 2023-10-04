import { ActionIcon, Center } from '@mantine/core';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { FilterPartTypeEnum } from '@novu/shared';

import type { IForm } from './formTypes';
import { Conditions, IConditions } from '../../../components/conditions';
import { When } from '../../../components/utils/When';
import { Condition, ConditionPlus, ConditionsFile } from '../../../design-system/icons';
import { colors, Text, Tooltip } from '../../../design-system';
import { useStepFormPath } from '../hooks/useStepFormPath';
import { useFilterPartsList } from '../hooks/useFilterPartsList';

export function ConditionsSettings({ root = false }: { root?: boolean }) {
  const { watch, setValue, getValues } = useFormContext<IForm>();
  const [filterOpen, setFilterOpen] = useState(false);

  const stepFormPath = useStepFormPath();
  const filters = watch(`${stepFormPath}.filters.0.children` as any);
  const filterPartsList = useFilterPartsList();

  const PlusIcon = root ? ConditionsFile : ConditionPlus;
  const ConditionsIcon = root ? ConditionsFile : Condition;

  const updateConditions = (conditions: IConditions[]) => {
    setValue(`${stepFormPath}.filters` as any, conditions, { shouldDirty: true });
  };

  if (filterOpen) {
    const [conditions, name] = getValues([`${stepFormPath}.filters` as any, `${stepFormPath}.name` as any]);

    return (
      <Conditions
        isOpened={filterOpen}
        name={name || ''}
        onClose={() => {
          setFilterOpen(false);
        }}
        updateConditions={updateConditions}
        conditions={conditions}
        filterPartsList={filterPartsList}
        defaultFilter={FilterPartTypeEnum.PAYLOAD}
      />
    );
  }

  return (
    <div style={{ color: colors.B60 }}>
      <When truthy={(filters && filters?.length === 0) || !filters}>
        <Tooltip label={`Add ${root ? 'group' : ''} conditions`}>
          <ActionIcon
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
