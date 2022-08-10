import styled from 'styled-components';
import { IThemePreferenceItem } from '../../../../store/novu-theme.context';

export const accordionStyles = (baseTheme: IThemePreferenceItem, font: string) => {
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
      '&:hover': {
        backgroundColor: baseTheme.accordion.background,
        borderRadius: '7px',
      },
    },
    icon: {
      color: baseTheme.accordion.icon.inactive,
    },
  };
};

export const switchStyles = (baseTheme: IThemePreferenceItem) => {
  return {
    input: {
      background: baseTheme.switch.background,
      width: '41px',
      height: '24px',
      border: 'transparent',
      '&::before': {
        border: 'transparent',
        width: '20px',
        height: '20px',
      },
      '&:disabled': {
        opacity: 0.3,
      },
      '&:disabled:not(:checked)': {
        background: baseTheme.switch?.backgroundUnchecked,
      },
      '&:checked': {
        background: baseTheme.switch?.backgroundChecked,
      },
    },
  };
};

export const Text = styled.div<{ color: string; size: 'sm' | 'md' | 'lg' }>`
  color: ${({ color }) => color};
  font-size: ${({ size }) => (size === 'sm' ? '12px' : '14px')};
  font-style: normal;
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
