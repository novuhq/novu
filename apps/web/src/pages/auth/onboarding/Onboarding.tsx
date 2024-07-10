import { useColorScheme } from '@novu/design-system';
import { css } from '@novu/novui/css';
import { COMPANY_LOGO_TEXT_PATH, COMPANY_LOGO_TEXT_PATH_DARK_TEXT } from '../../../constants/assets';
import { GetStartedPageV2 } from '../../../studio/components/GetStartedPageV2/index';

export function OnboardingPage() {
  const { colorScheme } = useColorScheme();

  return (
    <div
      className={css({
        bg: 'surface.page',
      })}
    >
      <div
        className={css({
          paddingTop: '32px',
          paddingLeft: '32px',
        })}
      >
        <div className={css({ width: '100%', height: '375' })}>
          <img
            // TODO: these assets are not the same dimensions!
            src={colorScheme === 'dark' ? COMPANY_LOGO_TEXT_PATH : COMPANY_LOGO_TEXT_PATH_DARK_TEXT}
            className={css({
              h: '200',
            })}
          />
        </div>
      </div>
      <GetStartedPageV2 location="onboarding" />
    </div>
  );
}
