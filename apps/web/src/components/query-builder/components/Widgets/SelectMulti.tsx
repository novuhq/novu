import React, { useContext } from 'react';
import { clone } from '../../utils/clone';
import { BuilderContext } from '../Context';

export interface SelectMultiProps {
  values: Array<{ value: string; label: string }>;
  selectedValue: string[];
  id: string;
}

export const SelectMulti: React.FC<SelectMultiProps> = ({ values, selectedValue, id }: SelectMultiProps) => {
  const { data, setData, onChange, components, strings, readOnly } = useContext(BuilderContext);

  const { form } = components;

  const handleChange = (value: string) => {
    if (setData && onChange) {
      const clonedData = clone(data);
      const parentIndex = clonedData.findIndex((item: any) => item.id === id);

      clonedData[parentIndex].value = clonedData[parentIndex].value.filter((item: any) => item !== value);
      clonedData[parentIndex].value.push(value);

      setData(clonedData);
      onChange(clonedData);
    }
  };

  const handleDelete = (value: string) => {
    const clonedData = clone(data);
    const parentIndex = clonedData.findIndex((item: any) => item.id === id);

    clonedData[parentIndex].value = clonedData[parentIndex].value.filter((item: any) => item !== value);

    setData(clonedData);

    if (onChange) {
      onChange(clonedData);
    }
  };

  if (form && strings.form) {
    return (
      <form.SelectMulti
        onChange={handleChange}
        onDelete={handleDelete}
        selectedValue={selectedValue}
        emptyValue={strings.form.selectYourValue}
        values={values}
        disabled={!!readOnly}
      />
    );
  }

  return null;
};
