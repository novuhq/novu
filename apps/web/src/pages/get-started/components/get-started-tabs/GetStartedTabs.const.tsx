import { Digest, HalfClock, IconOutlineNotificationsActive, IconOutlinePublic, Translation } from '@novu/design-system';
import { CSSProperties } from 'react';
import { OnboardingUseCasesTabsEnum } from '../../consts/OnboardingUseCasesTabsEnum';

export interface GetStartedTabConfig {
  value: OnboardingUseCasesTabsEnum;
  icon: JSX.Element;
  title: string;
}
const ICON_STYLE: Partial<CSSProperties> = { height: 20, width: 20, marginBottom: '12px' };

export const TAB_CONFIGS: GetStartedTabConfig[] = [
  {
    value: OnboardingUseCasesTabsEnum.IN_APP,
    icon: <IconOutlineNotificationsActive style={ICON_STYLE} />,
    title: 'In-app',
  },
  {
    value: OnboardingUseCasesTabsEnum.MULTI_CHANNEL,
    icon: <IconOutlinePublic style={ICON_STYLE} />,
    title: 'Multi-channel',
  },
  {
    value: OnboardingUseCasesTabsEnum.DIGEST,
    // TODO: discuss Material Design Icon with Nik: <IconOutlineAutoAwesome />,
    icon: <Digest style={ICON_STYLE} />,
    title: 'Digest',
  },
  {
    value: OnboardingUseCasesTabsEnum.DELAY,
    // TODO: discuss Material Design Icon with Nik: <IconOutlineAvTimer />,
    icon: <HalfClock style={ICON_STYLE} />,
    title: 'Delay',
  },
  {
    value: OnboardingUseCasesTabsEnum.TRANSLATION,
    // TODO: discuss Material Design Icon with Nik: <IconOutlineTranslate />,
    icon: <Translation style={ICON_STYLE} />,
    title: 'Translate',
  },
];
