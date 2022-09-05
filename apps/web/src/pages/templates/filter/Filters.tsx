import styled from '@emotion/styled';
import { BuilderFieldOperator } from '@novu/shared';
import { StepEntity } from '../../../components/templates/use-template-controller.hook';
import { colors } from '../../../design-system';

export const Filters = ({ step }: { step: StepEntity | null }) => {
  if (!step || !step.filters || !Array.isArray(step.filters)) {
    return null;
  }

  return (
    <>
      {step.filters.map((group) => {
        if (!Array.isArray(group.children) || group.children.length === 0) {
          return null;
        }

        return group.children.map((filter) => {
          return <Filter filter={filter} />;
        });
      })}
    </>
  );
};

interface IFilter {
  on?: 'payload' | 'subscriber';
  field?: string;
  value?: string;
  operator?: BuilderFieldOperator;
}

export const Filter = ({ filter }: { filter: IFilter }) => {
  return (
    <FilterItem>
      <FilterPosition>
        {filter.on} {filter.field} {translateOperator(filter.operator)}
      </FilterPosition>
      <FilterValue>{filter.value}</FilterValue>
    </FilterItem>
  );
};

const translateOperator = (operator?: BuilderFieldOperator) => {
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

const FilterPosition = styled.span`
  font-weight: bold;
`;

const FilterValue = styled.div`
  color: ${colors.B60};
  margin-top: 7px;
`;

const FilterItem = styled.div`
  background: ${colors.B20};
  box-shadow: 0px 5px 20px rgb(0 0 0 / 20%);
  margin-bottom: 15px;
  padding: 15px;
  border-radius: 7px;
`;
