import styled from '@emotion/styled';
import { colors, shadows } from '@novu/design-system';
import { ComponentProps, forwardRef } from 'react';
import { AndroidIcon, AppleIcon } from '../icons';

export type IPhonePlatformSwitchProps = Pick<ComponentProps<'input'>, 'checked' | 'onChange' | 'className' | 'style'>;

const switchContainerPadding = 5;
const thumbWidth = 48;
const thumbHeight = 28;

const AppleIconStyled = styled(AppleIcon)`
  min-width: 16px;
  width: 16px;
  height: 16px;
`;

const AndroidIconStyled = styled(AndroidIcon)`
  min-width: 16px;
  width: 16px;
  height: 16px;
`;

const SwitchContainer = styled.div`
  position: relative;
  width: 120px;
  height: 40px;
  padding: ${switchContainerPadding}px;
  border-radius: 30px;
  border: 1px solid ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B40 : colors.B70)};
  background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B15 : colors.white)};
`;

const SwitchInput = styled.input`
  height: 0;
  opacity: 0;
  padding: 0;
  margin: 0;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 0;
`;

const ButtonsContainer = styled.label`
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: space-between;
  gap: 5px;
  cursor: pointer;
`;

const Thumb = styled.div<Pick<IPhonePlatformSwitchProps, 'checked'>>`
  position: absolute;
  left: ${({ checked }) =>
    checked ? `${switchContainerPadding}px` : `calc(100% - ${thumbWidth}px - ${switchContainerPadding}px)`};
  z-index: 0;
  width: ${thumbWidth}px;
  height: ${thumbHeight}px;
  border-radius: 30px;
  background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B40 : colors.BGLight)};
  box-shadow: ${shadows.dark};
  transition: left 0.3s ease;
`;

const IconHolder = styled.span<{ isSelected: boolean }>`
  z-index: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  width: ${thumbWidth}px;
  height: ${thumbHeight}px;
  transition: color 0.3s ease;
  color: ${({ theme, isSelected }) =>
    theme.colorScheme === 'dark' ? colors.white : isSelected ? colors.B20 : colors.B60};
`;

export const PhonePlatformSwitch: React.FC<IPhonePlatformSwitchProps> = forwardRef<
  HTMLInputElement,
  IPhonePlatformSwitchProps
>(({ checked, onChange, className }, ref) => {
  return (
    <SwitchContainer className={className}>
      <SwitchInput id="phonePlatformSwitch" ref={ref} type="checkbox" checked={checked} onChange={onChange} />
      <ButtonsContainer htmlFor="phonePlatformSwitch">
        <Thumb checked={checked} />
        <IconHolder isSelected={!!checked}>
          <AppleIconStyled />
        </IconHolder>
        <IconHolder isSelected={!checked}>
          <AndroidIconStyled />
        </IconHolder>
      </ButtonsContainer>
    </SwitchContainer>
  );
});
