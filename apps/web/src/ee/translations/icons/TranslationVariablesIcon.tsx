import React from 'react';
import { useMantineColorScheme } from '@mantine/core';

export const TranslationVariablesIcon = () => {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  if (isDark) {
    return (
      <svg
        style={{
          boxShadow: '0px 5px 20px 0px rgba(0, 0, 0, 0.20)',
        }}
        xmlns="http://www.w3.org/2000/svg"
        width="73"
        height="58"
        viewBox="0 0 73 58"
        fill="none"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M2.12 56.3688C3.2 57.4563 4.46 58 5.9 58H67.1C68.54 58 69.8 57.4563 70.88 56.3688C71.96 55.2812 72.5 54.0125 72.5 52.5625V5.4375C72.5 3.9875 71.96 2.71875 70.88 1.63125C69.8 0.54375 68.54 0 67.1 0H5.9C4.46 0 3.2 0.54375 2.12 1.63125C1.04 2.71875 0.5 3.9875 0.5 5.4375V52.5625C0.5 54.0125 1.04 55.2812 2.12 56.3688ZM47.3 42.7812H14.9V37.3438H47.3V42.7812ZM58.1 42.7812H52.7V37.3438H58.1V42.7812ZM20.3 31.9062H14.9V26.4688H20.3V31.9062ZM58.1 31.9062H25.7V26.4688H58.1V31.9062ZM37 21.4375H15V16H37V21.4375ZM47.8 21.4375H42.4V16H47.8V21.4375ZM52.6 21.4375H58V16H52.6V21.4375Z"
          fill="#3D3D4D"
        />
      </svg>
    );
  }

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="73" height="58" viewBox="0 0 73 58" fill="none">
      <path
        d="M0.5 8C0.5 3.58172 4.08172 0 8.5 0H64.5C68.9183 0 72.5 3.58172 72.5 8V50C72.5 54.4183 68.9183 58 64.5 58H8.5C4.08172 58 0.5 54.4183 0.5 50V8Z"
        fill="#D5D5D9"
      />
      <path d="M47.5 20H14.5V14H47.5V20Z" fill="#828299" />
      <path d="M58.5 20H53V14H58.5V20Z" fill="#828299" />
      <path d="M25.5 32H58.5V26H25.5V32Z" fill="#828299" />
      <path d="M14.5 32H20V26H14.5V32Z" fill="#828299" />
      <path d="M47.5 44H14.5V38H47.5V44Z" fill="#828299" />
      <path d="M58.5 44H53V38H58.5V44Z" fill="#828299" />
    </svg>
  );
};
