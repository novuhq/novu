import styled from '@emotion/styled';
import { useMantineColorScheme } from '@mantine/core';
import { BuilderFieldOperator, FieldOperatorEnum, FilterParts, FilterPartTypeEnum } from '@novu/shared';

import type { IFormStep } from '../components/formTypes';
import { colors } from '@novu/design-system';
import { useWatch } from 'react-hook-form';
import { channels } from '../../../utils/channels';

export const Filters = ({ step }: { step?: IFormStep }) => {
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
  const steps: IFormStep[] = useWatch({
    name: 'steps',
  });

  const filterValue = getFilterValue(filter);

  return (
    <FilterItem className="filter-item" dark={colorScheme === 'dark'}>
      <FilterPosition>{getFilterLabel(filter, steps)}</FilterPosition>
      <FilterValue className="filter-item-value">{filterValue}</FilterValue>
    </FilterItem>
  );
};

export const translateOperator = (operator?: BuilderFieldOperator) => {
  if (operator === FieldOperatorEnum.NOT_EQUAL) {
    return 'not equal';
  }
  if (operator === FieldOperatorEnum.LARGER) {
    return 'larger';
  }
  if (operator === FieldOperatorEnum.SMALLER) {
    return 'smaller';
  }
  if (operator === FieldOperatorEnum.LARGER_EQUAL) {
    return 'larger or equal';
  }
  if (operator === FieldOperatorEnum.SMALLER_EQUAL) {
    return 'smaller or equal';
  }
  if (operator === FieldOperatorEnum.NOT_IN) {
    return 'do not include';
  }
  if (operator === FieldOperatorEnum.IN) {
    return 'includes';
  }

  return 'equal';
};

export const getFilterLabel = (filter: FilterParts, steps: IFormStep[]): string => {
  if (filter.on === FilterPartTypeEnum.IS_ONLINE) {
    return `is online right now ${translateOperator(FieldOperatorEnum.EQUAL)}`;
  }
  if (filter.on === FilterPartTypeEnum.IS_ONLINE_IN_LAST) {
    return `online in the last "X" ${filter.timeOperator}`;
  }

  if (filter.on === FilterPartTypeEnum.PREVIOUS_STEP) {
    const dependingStep = steps.find((item) => item.uuid === filter.step);

    if (!dependingStep) {
      return 'Previous step';
    }

    const sameTypeSteps = steps.filter((step) => step.template.type === dependingStep.template.type);
    const foundIndex = sameTypeSteps.findIndex((step) => step.uuid === dependingStep.uuid);

    const label = channels.find((item) => item.channelType === dependingStep.template.type)?.label;

    return `Previous step - ${label} ${sameTypeSteps.length > 1 ? `(${foundIndex + 1}) ` : ''} `;
  }

  return `${filter.on} ${filter.field} ${translateOperator(filter.operator)}`;
};

const getFilterValue = (filter: FilterParts) => {
  if (filter.on === FilterPartTypeEnum.PREVIOUS_STEP) {
    return filter.stepType;
  }

  let value = filter.value;

  if (filter.on === FilterPartTypeEnum.IS_ONLINE) {
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
