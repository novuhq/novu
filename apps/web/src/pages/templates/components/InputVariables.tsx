import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { useStepFormPath } from '../hooks/useStepFormPath';
import { VarItem } from './email-editor/variables-management/VarItem';
import { VarItemsDropdown } from './email-editor/variables-management/VarItemsDropdown';

const mapLevel = (input) => {
  return Object.keys(input.properties).reduce((prev, key) => {
    const property = input.properties[key];

    if (property.type === 'object') {
      prev[key] = mapLevel(property);

      return prev;
    }

    if (property.type === 'array') {
      const items = property.items;

      if (Array.isArray(items)) {
        prev[key] = '[' + items.map((item) => item.type).join(', ') + ']';

        return prev;
      }

      prev[key] = items.type + '[]';

      return prev;
    }

    prev[key] = property.type;

    return prev;
  }, {});
};

export const InputVariables = () => {
  const stepFormPath = useStepFormPath();
  const { watch } = useFormContext();
  const input = watch(`${stepFormPath}.input`);

  const list = useMemo(() => {
    if (!input) {
      return {};
    }

    return mapLevel(input);
  }, [input]);

  return (
    <>
      {Object.keys(list).map((key) => {
        if (typeof list[key] === 'object') {
          return <VarItemsDropdown name={key} type={list[key]} highlight={undefined} />;
        }

        return <VarItem name={key} type={list[key]} />;
      })}
    </>
  );
};
