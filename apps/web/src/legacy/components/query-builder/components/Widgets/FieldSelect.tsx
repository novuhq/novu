import React, { useContext } from 'react';
import { clone } from '../../utils/clone';
import { isOptionList } from '../../utils/types';
import { BuilderContext } from '../Context';

interface FieldSelectProps {
  selectedValue: string;
  id: string;
}

export const FieldSelect: React.FC<FieldSelectProps> = ({ selectedValue, id }: FieldSelectProps) => {
  const { fields, data, setData, onChange, components, strings, readOnly } = useContext(BuilderContext);

  const { form } = components;

  const handleChange = (value: string) => {
    const clonedData = clone(data);
    const parentIndex = clonedData.findIndex((item: any) => item.id === id);
    const nextField = fields.filter((item) => item.field === value)[0];

    clonedData[parentIndex].field = value;
    delete clonedData[parentIndex].value;
    delete clonedData[parentIndex].operators;
    delete clonedData[parentIndex].operator;

    // eslint-disable-next-line default-case
    switch (nextField.type) {
      case 'BOOLEAN':
        clonedData[parentIndex].value = false;
        break;

      case 'DATE':
        clonedData[parentIndex].value =
          nextField.operators && ['BETWEEN', 'NOT_BETWEEN'].includes(nextField.operators[0]) ? ['', ''] : '';

        clonedData[parentIndex].operator = nextField.operators && nextField.operators[0];
        clonedData[parentIndex].operators = nextField.operators;
        break;

      case 'TEXT':
        clonedData[parentIndex].value =
          nextField.operators && ['BETWEEN', 'NOT_BETWEEN'].includes(nextField.operators[0]) ? ['', ''] : '';

        clonedData[parentIndex].operator = nextField.operators && nextField.operators[0];
        clonedData[parentIndex].operators = nextField.operators;
        break;

      case 'NUMBER':
        clonedData[parentIndex].value =
          nextField.operators && ['BETWEEN', 'NOT_BETWEEN'].includes(nextField.operators[0]) ? ['0', '0'] : '0';

        clonedData[parentIndex].operator = nextField.operators && nextField.operators[0];
        clonedData[parentIndex].operators = nextField.operators;
        break;

      case 'LIST':
        if (isOptionList(nextField.value)) {
          clonedData[parentIndex].value = nextField.value[0].value;
        }

        clonedData[parentIndex].operator = nextField.operators && nextField.operators[0];
        clonedData[parentIndex].operators = nextField.operators;
        break;

      case 'MULTI_LIST':
        if (isOptionList(nextField.value)) {
          clonedData[parentIndex].value = [];
        }

        clonedData[parentIndex].operator = nextField.operators && nextField.operators[0];
        clonedData[parentIndex].operators = nextField.operators;
        break;
      case 'STATEMENT':
        clonedData[parentIndex].value = nextField.value;
        break;
    }

    setData(clonedData);
    if (onChange) {
      onChange(clonedData);
    }
  };

  const fieldNames = fields.map((field) => ({
    value: field.field,
    label: field.label,
  }));

  if (form && strings.form) {
    return (
      <form.Select
        values={fieldNames}
        selectedValue={selectedValue}
        emptyValue={strings.form.selectYourValue}
        onChange={handleChange}
        disabled={readOnly}
      />
    );
  }

  return null;
};
