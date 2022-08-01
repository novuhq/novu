import styled from 'styled-components';

export const accordionStyles = (baseTheme, font) => {
  return {
    item: {
      borderBottom: 'none',
      boxShadow: baseTheme.boxShadow,
      backgroundColor: baseTheme.background,
      marginBottom: '15px',
      borderRadius: '7px',
    },
    content: {
      color: baseTheme.fontColor,
      fontFamily: font,
    },
    control: {
      fontFamily: font,
      '&:hover': {
        backgroundColor: baseTheme.background,
        borderRadius: '7px',
      },
    },
    icon: {
      color: baseTheme.timeMarkFontColor,
    },
  };
};

export const switchStyles = (baseTheme) => {
  return {
    input: {
      backgroundColor: baseTheme.timeMarkFontColor,
      width: '40px',
      height: '24px',
      border: 'transparent',
      '&::before': {
        border: 'transparent',
        width: '20px',
        height: '20px',
      },
      '&:checked': {
        background: baseTheme.notificationItemBeforeBrandColor,
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
  padding: 0px;
  gap: 5px;
  align-items: flex-start;
`;
