import styled from '@emotion/styled';
import { colors } from '@novu/design-system';

// TODO: Allow backgroundUrl to be dynamic
export const MobileFrameStyled = styled.div<{ isAndroid: boolean }>`
  border-radius: 40px;
  border: 24px solid ${colors.B15};
  box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
  width: 440px;
  height: 880px;
  overflow: hidden;
  position: relative;
  background-position: center;
  background-repeat: no-repeat;
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.6) 100%),
    url(/static/images/mobilePreview/${({ isAndroid }) => (isAndroid ? 'android' : 'iphone')}.jpeg) no-repeat center
      center / cover,
    lightgray;
`;

export const IphonecameraNotchStyled = styled.div<{ isAndroid: boolean }>`
  height: 30px;
  display: ${({ isAndroid }) => (isAndroid ? 'none' : 'flex')};
  justify-content: center;
`;

export const AndroidcameraNotchStyled = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: ${colors.B15};
  position: relative;
`;

export const AndroidCameraDotStyled = styled.div`
  width: 4px;
  height: 4px;
  background-color: ${colors.white};
  opacity: 0.5;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
`;

export const Statusbarstyled = styled.div<{ isAndroid: boolean }>`
  background-color: transparent;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-inline: 20px;
  padding-top: ${({ isAndroid }) => (isAndroid ? '15px' : '0')};
`;

export const ContentStyled = styled.div<{ isError: boolean }>`
  display: flex;
  padding: 16px;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  flex-shrink: 0;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px);
  ${({ isError }) => isError && `border: 1px solid ${colors.error};`}
`;

export const ContentWrapperStyled = styled.div`
  padding: 8px;
  margin-top: 72px;
`;

export const ContentHeaderStyled = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
`;
