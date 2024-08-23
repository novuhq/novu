import { SwitchStylesNames } from '@mantine/core';
import { defineSlotRecipe } from '@pandacss/dev';

// full enumeration of the component library's slots
const SLOTS: SwitchStylesNames[] = [
  'root',
  'track',
  'trackLabel',
  'thumb',
  'input',
  'body',
  'labelWrapper',
  'label',
  'description',
  'error',
];

export const TOGGLE_RECIPE = defineSlotRecipe({
  className: 'toggle',
  jsx: ['Toggle'],
  slots: SLOTS,
  base: {
    track: {
      borderRadius: 'pill',
      backgroundColor: 'toggle.background',
      border: 'none',
      height: 150,
      width: 250,
      'input:checked + &': {
        backgroundColor: 'toggle.checked',
      },
    },
    thumb: {
      backgroundColor: 'toggle.thumb',
      border: 'none',
      height: 125,
      width: 125,
    },
  },
});
