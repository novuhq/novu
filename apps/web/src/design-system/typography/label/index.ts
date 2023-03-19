import styled from '@emotion/styled';

export const Label = styled.div<{ gradientColor?: 'red' | 'blue' | 'none' }>`
  height: 20px;
  font-family: 'Lato', serif;
  font-style: normal;
  font-weight: 700;
  font-size: 16px;
  line-height: 20px;

  display: flex;
  align-items: center;

  ${({ gradientColor }) => {
    return (
      gradientColor !== 'none' &&
      `
    background: ${
      gradientColor === 'red'
        ? 'linear-gradient(90deg, #DD2476 0%, #FF512F 100%)'
        : 'linear-gradient(0deg, #14deeb 0%, #446edc 100%)'
    };
        
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;  
      `
    );
  }};
`;
