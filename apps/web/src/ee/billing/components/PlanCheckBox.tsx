import React from 'react';
import { Checkbox } from '@novu/design-system';

export const PlanCheckBox = () => (
  <Checkbox
    checked
    readOnly
    label=""
    styles={{
      root: {
        justifyContent: 'center',
        display: 'flex',
      },
    }}
  />
);
