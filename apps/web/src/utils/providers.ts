import { ColorScheme } from '@mantine/core';
import { CONTEXT_PATH } from '../config';

export const getLogoFileName = (id, schema: ColorScheme): string => {
  if (schema === 'dark') {
    return `${CONTEXT_PATH}/static/images/providers/dark/square/${id}.svg`;
  }

  return `${CONTEXT_PATH}/static/images/providers/light/square/${id}.svg`;
};
