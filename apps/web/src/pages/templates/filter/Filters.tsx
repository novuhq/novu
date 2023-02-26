import styled from '@emotion/styled';
import { useMantineColorScheme } from '@mantine/core';
import { BuilderFieldOperator, FilterParts } from '@novu/shared';

import type { IStepEntity } from '../components/formTypes';
import { colors } from '../../../design-system';

export const Filters = ({ step }: { step: IStepEntity | null }) => {
  if (!step || !step.filters || !Array.isArray(step.filters)) {
    return null;
  }

  return (
    <>
      {step.filters.map((group) => {
        if (!Array.isArray(group.children) || group.children.length === 0) {
          return null;
        }

        return group.children.map((filter, i) => {
          const filterKey = filter.on ? `${filter.on}-field-filter-${i}` : `filter-${i}`;

          return <Filter key={filterKey} filter={filter} />;
        });
      })}
    </>
  );
};

export const Filter = ({ filter }: { filter: FilterParts }) => {
  const { colorScheme } = useMantineColorScheme();

  const filterValue = getFilterValue(filter);

  return (
    <FilterItem className="filter-item" dark={colorScheme === 'dark'}>
      <FilterPosition>{getFilterLabel(filter)}</FilterPosition>
      <FilterValue className="filter-item-value">{filterValue}</FilterValue>
    </FilterItem>
  );
};

export const translateOperator = (operator?: BuilderFieldOperator) => {
  if (operator === 'NOT_EQUAL') {
    return 'not equal';
  }
  if (operator === 'LARGER') {
    return 'larger';
  }
  if (operator === 'SMALLER') {
    return 'smaller';
  }
  if (operator === 'LARGER_EQUAL') {
    return 'larger or equal';
  }
  if (operator === 'SMALLER_EQUAL') {
    return 'smaller or equal';
  }
  if (operator === 'NOT_IN') {
    return 'do not include';
  }
  if (operator === 'IN') {
    return 'includes';
  }

  return 'equal';
};

export const getFilterLabel = (filter: FilterParts): string => {
  if (filter.on === 'isOnline') {
    return `is online right now ${translateOperator('EQUAL')}`;
  }
  if (filter.on === 'isOnlineInLast') {
    return `online in the last "X" ${filter.timeOperator}`;
  }

  return `${filter.on} ${filter.field} ${translateOperator(filter.operator)}`;
};

const getFilterValue = (filter: FilterParts) => {
  let value = filter.value;

  if (filter.on === 'isOnline') {
    if (filter.value === true) {
      value = 'Yes';
    }
    if (filter.value === false) {
      value = 'No';
    }
  }

  return value;
};

const FilterPosition = styled.span`
  font-weight: bold;
`;

const FilterValue = styled.div`
  color: ${colors.B60};
  margin-top: 7px;
`;

const FilterItem = styled.div<{ dark: boolean }>`
  background: ${({ dark }) => (dark ? colors.B20 : colors.white)};
  box-shadow: 0px 5px 20px rgb(0 0 0 / 20%);
  margin-bottom: 15px;
  padding: 15px;
  border-radius: 7px;
`;
