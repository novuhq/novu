import { ColorScheme } from '@mantine/core';
import { CONTEXT_PATH } from '../config';

export const getLogoFileName = (id, schema: ColorScheme): string => {
  return `${CONTEXT_PATH}/static/images/providers/${schema}/square/${id}.svg`;
};
