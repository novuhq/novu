import React, { useContext } from 'react';
import { clone } from '../../utils/clone';
import { BuilderContext } from '../Context';

export interface SelectProps {
  selectedValue: string;
  values: Array<{ value: string; label: string }>;
  id: string;
}

export const Select: React.FC<SelectProps> = ({ selectedValue, values, id }: SelectProps) => {
  const { data, setData, onChange, components, strings, readOnly } = useContext(BuilderContext);

  const { form } = components;

  const handleChange = (value: string) => {
    const clonedData = clone(data);
    const parentIndex = clonedData.findIndex((item: any) => item.id === id);

    clonedData[parentIndex].value = value;

    setData(clonedData);
    if (onChange) {
      onChange(clonedData);
    }
  };

  if (form && strings.form && !readOnly) {
    return (
      <form.Select
        onChange={handleChange}
        selectedValue={selectedValue}
        emptyValue={strings.form.selectYourValue}
        values={values}
        disabled={readOnly}
      />
    );
  }

  return null;
};
