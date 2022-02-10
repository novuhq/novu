import React from 'react';
import { Checkbox, ICheckboxProps } from '../tempCheckbox/Checkbox';

export default React.forwardRef<HTMLDivElement, ICheckboxProps>(function CheckboxItem(
  { ...rest }: ICheckboxProps,
  ref
) {
  return (
    <div ref={ref} {...rest}>
      <Checkbox label={rest.label} />
    </div>
  );
});
