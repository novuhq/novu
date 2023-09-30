import React from 'react';
import styled from '@emotion/styled';

import { IThemeUserPreferences } from '../../../../store/novu-theme.context';

export const accordionStyles = (baseTheme: IThemeUserPreferences, font: string) => {
  return {
    item: {
      borderBottom: 'none',
      boxShadow: baseTheme.accordion.boxShadow,
      backgroundColor: baseTheme.accordion.background,
      marginBottom: '15px',
      borderRadius: '7px',
    },
    content: {
      color: baseTheme.accordion.fontColor,
      fontFamily: font,
    },
    control: {
      fontFamily: font,
      height: '65px',
      '&:hover': {
        backgroundColor: baseTheme.accordion.background,
        borderRadius: '7px',
      },
    },
    chevron: {
      color: baseTheme.accordion?.arrowColor,
    },
  };
};

export const switchStyles = (baseTheme: IThemeUserPreferences) => {
  return {
    root: {
      width: '100%',
      maxWidth: '70px',
      display: 'flex',
      alignItems: 'center',
    },
    input: {
      background: baseTheme.accordionItem?.switch?.backgroundUnchecked,
      width: '1px',
      height: '1px',
      border: 'transparent',
      cursor: 'pointer',
      '&::before': {
        border: 'transparent',
        width: '20px',
        height: '20px',
      },
      '&:checked ~ label': {
        background: baseTheme.accordionItem?.switch?.backgroundChecked,
      },
      '&:not(checked) ~ label': {
        background: baseTheme.accordionItem?.switch?.backgroundUnchecked,
      },
      '&:disabled:not(:checked) ~ label': {
        background: baseTheme.accordionItem?.switch?.backgroundUnchecked,
      },
      '&:disabled': {
        opacity: 0.3,
      },
    },
    track: {
      width: '46px',
      height: '24px',
      border: 'none',
    },
    thumb: {
      border: 'none',
    },
  };
};

export const Text = styled.div<{ size: 'sm' | 'md' | 'lg' }>`
  font-size: ${({ size }) => (size === 'sm' ? '12px' : '14px')};
  font-style: normal;
  align-items: center;
  font-weight: ${({ size }) => (size === 'lg' ? '700' : '400')};
  line-height: ${({ size }) => (size === 'sm' ? '14.4px' : '16.8px')};
  text-align: left;
`;

export const TextBlock = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0;
  gap: 5px;
  align-items: flex-start;
`;
