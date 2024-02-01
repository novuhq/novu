import { ProductUseCasesEnum } from '@novu/shared';
import { RingingBell } from '@novu/design-system/dist/cjs';

export const onboardingUseCases: OnboardingUseCases = {
  [ProductUseCasesEnum.IN_APP]: {
    steps: ['Configure In-App provider', 'Build a workflow', 'Connect trigger and run test', 'Track activity feed'],
    demo: RingingBell,
  },
  [ProductUseCasesEnum.MULTI_CHANNEL]: {
    steps: ['Configure providers', 'Build a workflow', 'Connect trigger and run test', 'Track activity feed'],
    demo: RingingBell,
  },
  [ProductUseCasesEnum.DELAY]: {
    steps: [
      'Configure a provider',
      'Build a workflow',
      'Set-up a digest preferences',
      'Connect trigger and run test',
      'Track activity feed',
    ],
    demo: () => {
      return <h1>GIF</h1>;
    },
  },
  [ProductUseCasesEnum.TRANSLATION]: {
    steps: [
      'Configure a provider',
      'Add a translation group',
      'Upload JSON files with languages',
      'Update content with translation variables',
    ],
    demo: RingingBell,
  },
  [ProductUseCasesEnum.DIGEST]: {
    steps: [
      'Configure a provider',
      'Build a workflow',
      'Set-up a delay preferences',
      'Connect trigger and run test',
      'Track activity feed',
    ],
    demo: RingingBell,
  },
};

export type OnboardingUseCases = {
  [key in ProductUseCasesEnum]: OnboardingUseCase;
};

export type OnboardingUseCase = {
  steps: string[];
  demo: any;
};
