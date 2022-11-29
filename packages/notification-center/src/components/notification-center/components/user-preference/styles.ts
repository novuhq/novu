import styled from 'styled-components';
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
    icon: {
      color: baseTheme.accordion?.arrowColor,
    },
  };
};

export const switchStyles = (baseTheme: IThemeUserPreferences) => {
  return {
    input: {
      background: baseTheme.accordionItem?.switch?.backgroundUnchecked,
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
        background: baseTheme.accordionItem?.switch?.backgroundUnchecked,
      },
      '&:checked': {
        background: baseTheme.accordionItem?.switch?.backgroundChecked,
      },
    },
  };
};

export const Text = styled.div<{ color: string; size: 'sm' | 'md' | 'lg' }>`
  color: ${({ color }) => color};
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
