import React, { useContext } from 'react';
import styled from 'styled-components';
import { BuilderFieldOperator } from '@notifire/shared';
import { clone } from '../../utils/clone';
import { isBoolean, isOptionList, isString, isStringArray, isUndefined } from '../../utils/types';
import { BuilderContext } from '../Context';
import { Boolean } from '../Widgets/Boolean';
import { FieldSelect } from '../Widgets/FieldSelect';
import { Input } from '../Widgets/Input';
import { OperatorSelect } from '../Widgets/OperatorSelect';
import { Select } from '../Widgets/Select';
import { SelectMulti } from '../Widgets/SelectMulti';

const BooleanContainer = styled.div`
  align-self: center;
`;

export interface ComponentProps {
  field: string;
  value?: string | string[] | boolean;
  operator?: BuilderFieldOperator;
  id: string;
}

export const Component: React.FC<ComponentProps> = ({
  field: fieldRef,
  value: selectedValue,
  operator,
  id,
}: ComponentProps) => {
  const { fields, data, setData, onChange, components, strings, readOnly } = useContext(BuilderContext);
  const { Component: ComponentContainer, Remove } = components;

  const handleDelete = () => {
    let clonedData = clone(data);
    const index = clonedData.findIndex((item: any) => item.id === id);
    const parentIndex = clonedData.findIndex((item: any) => item.id === clonedData[index].parent);
    const parent = clonedData[parentIndex];

    parent.children = parent.children.filter((item: string) => item !== id);
    clonedData = clonedData.filter((item: any) => item.id !== id);

    setData(clonedData);
    if (onChange) {
      onChange(clonedData);
    }
  };

  if (fields && strings.component) {
    if (fieldRef === '') {
      return (
        <ComponentContainer
          controls={!readOnly && <Remove label={strings.component.delete} onClick={handleDelete} />}
          data-test-id="filter-builder-row">
          <FieldSelect selectedValue="" id={id} />
        </ComponentContainer>
      );
    }
    try {
      const fieldIndex = fields.findIndex((item) => item.field === fieldRef);

      const { field, operators, type, value: fieldValue } = fields[fieldIndex];

      const operatorsOptionList =
        operators &&
        operators.map((item) => ({
          value: item,
          label: strings.operators && strings.operators[item],
        }));

      return (
        <ComponentContainer
          controls={!readOnly && <Remove label={strings.component.delete} onClick={handleDelete} />}
          data-test-id="filter-builder-row">
          <FieldSelect selectedValue={field} id={id} />

          {type === 'BOOLEAN' && isBoolean(selectedValue) && (
            <BooleanContainer>
              <Boolean id={id} selectedValue={selectedValue} />
            </BooleanContainer>
          )}

          {type === 'LIST' && isString(selectedValue) && isOptionList(fieldValue) && isOptionList(operatorsOptionList) && (
            <>
              <OperatorSelect id={id} values={operatorsOptionList} selectedValue={operator} />
              {operator && <Select id={id} selectedValue={selectedValue} values={fieldValue} />}
            </>
          )}

          {type === 'MULTI_LIST' &&
            isOptionList(fieldValue) &&
            isOptionList(operatorsOptionList) &&
            isStringArray(selectedValue) && (
              <>
                <OperatorSelect id={id} values={operatorsOptionList} selectedValue={operator} />
                {operator && <SelectMulti id={id} values={fieldValue} selectedValue={selectedValue} />}
              </>
            )}

          {type === 'TEXT' &&
            isOptionList(operatorsOptionList) &&
            (isString(selectedValue) || isStringArray(selectedValue)) && (
              <>
                <OperatorSelect id={id} values={operatorsOptionList} selectedValue={operator} />
                {operator && <Input type="text" value={selectedValue} id={id} />}
              </>
            )}

          {type === 'NUMBER' &&
            isOptionList(operatorsOptionList) &&
            (isString(selectedValue) || isStringArray(selectedValue)) && (
              <>
                <OperatorSelect id={id} values={operatorsOptionList} selectedValue={operator} />
                {operator && <Input type="number" value={selectedValue} id={id} />}
              </>
            )}

          {type === 'DATE' &&
            isOptionList(operatorsOptionList) &&
            (isString(selectedValue) || isStringArray(selectedValue)) && (
              <>
                <OperatorSelect id={id} values={operatorsOptionList} selectedValue={operator} />
                {!isUndefined(operator) && <Input type="date" value={selectedValue} id={id} />}
              </>
            )}
        </ComponentContainer>
      );
    } catch (e) {
      // tslint:disable-next-line: no-console
      console.error(`Field "${fieldRef}" not found in fields definition.`);
    }
  }

  return null;
};
