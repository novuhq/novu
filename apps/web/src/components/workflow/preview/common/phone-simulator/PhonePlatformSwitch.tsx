import { ComponentProps, forwardRef } from 'react';
import {
  AndroidIconStyled,
  AppleIconStyled,
  ButtonsContainer,
  IconHolder,
  SwitchContainer,
  SwitchInput,
  Thumb,
} from './PhonePlatformSwitch.styles';

export interface IPhonePlatformSwitchProps extends Pick<ComponentProps<'input'>, 'onChange' | 'className' | 'style'> {
  isIOS?: boolean;
}

export const PhonePlatformSwitch: React.FC<IPhonePlatformSwitchProps> = forwardRef<
  HTMLInputElement,
  IPhonePlatformSwitchProps
>(({ isIOS, onChange, className }, ref) => {
  return (
    <SwitchContainer className={className}>
      <SwitchInput id="phonePlatformSwitch" ref={ref} type="checkbox" checked={isIOS} onChange={onChange} />
      <ButtonsContainer htmlFor="phonePlatformSwitch">
        <Thumb isIOS={isIOS} />
        <IconHolder isSelected={!!isIOS}>
          <AppleIconStyled size="1rem" />
        </IconHolder>
        <IconHolder isSelected={!isIOS}>
          <AndroidIconStyled size="1rem" />
        </IconHolder>
      </ButtonsContainer>
    </SwitchContainer>
  );
});
