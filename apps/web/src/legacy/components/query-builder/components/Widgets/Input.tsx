import React, { useContext } from 'react';
import { clone } from '../../utils/clone';
import { isStringArray, isUndefined } from '../../utils/types';
import { BuilderContext } from '../Context';

interface InputProps {
  type: 'date' | 'number' | 'text';
  value: string | string[];
  id: string;
}

export const Input: React.FC<InputProps> = ({ type, value, id }: InputProps) => {
  const { data, setData, onChange, components, readOnly } = useContext(BuilderContext);

  const { form } = components;

  const handleChange = (changedValue: any, index?: number) => {
    const clonedData = clone(data);
    const parentIndex = clonedData.findIndex((item: any) => item.id === id);

    if (!isUndefined(index)) {
      clonedData[parentIndex].value[index] = changedValue;
    } else {
      clonedData[parentIndex].value = changedValue;
    }

    setData(clonedData);
    if (onChange) {
      onChange(clonedData);
    }
  };

  if (form) {
    if (isStringArray(value)) {
      return (
        <>
          <form.Input
            type={type}
            value={value[0]}
            onChange={(changedValue: any) => handleChange(changedValue, 0)}
            disabled={readOnly}
          />
          <form.Input
            type={type}
            value={value[1]}
            onChange={(changedValue: any) => handleChange(changedValue, 1)}
            disabled={readOnly}
          />
        </>
      );
    }

    return <form.Input type={type} value={value} onChange={handleChange} disabled={readOnly} />;
  }

  return null;
};
