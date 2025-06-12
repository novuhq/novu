import '@emotion/react';
import type { MantineTheme } from '@mantine/core';

declare module '@emotion/react' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface Theme extends MantineTheme {}
}
