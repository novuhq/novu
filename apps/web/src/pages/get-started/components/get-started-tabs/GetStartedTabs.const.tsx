import { RingingBell, MultiChannel, Digest, HalfClock, Translation } from '@novu/design-system';
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
    icon: <RingingBell style={ICON_STYLE} />,
    title: 'In-app',
  },
  {
    value: OnboardingUseCasesTabsEnum.MULTI_CHANNEL,
    icon: <MultiChannel style={ICON_STYLE} />,
    title: 'Multi-channel',
  },
  {
    value: OnboardingUseCasesTabsEnum.DIGEST,
    icon: <Digest style={ICON_STYLE} />,
    title: 'Digest',
  },
  {
    value: OnboardingUseCasesTabsEnum.DELAY,
    icon: <HalfClock style={ICON_STYLE} />,
    title: 'Delay',
  },
  {
    value: OnboardingUseCasesTabsEnum.TRANSLATION,
    icon: <Translation style={ICON_STYLE} />,
    title: 'Translate',
  },
];
