import { useMantineTheme } from '@mantine/core';
import { colors } from '../../config';

export const ViewportWide = () => {
  const theme = useMantineTheme();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      stroke="#00abfb"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M10 12h-7l3 -3m0 6l-3 -3" />
      <path d="M14 12h7l-3 -3m0 6l3 -3" />
      <path d="M3 6v-3h18v3" />
      <path d="M3 18v3h18v-3" />
    </svg>
  );
};
