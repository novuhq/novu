import { MobileFrameStyled } from './Mobile.styles';
import { Statusbar } from './Statusbar';

export function Mobile({ children }) {
  const isAndroid = false;

  return (
    <MobileFrameStyled isAndroid={isAndroid}>
      <div>
        <Statusbar isAndroid={isAndroid} />
      </div>

      {children}
    </MobileFrameStyled>
  );
}
