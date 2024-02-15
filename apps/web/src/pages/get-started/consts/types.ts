import { OnboardingUseCasesTabsEnum } from './OnboardingUseCasesTabsEnum';

export type OnboardingUseCases = Record<OnboardingUseCasesTabsEnum, OnboardingUseCase>;

export interface IOnboardingStep {
  title: string;
  Description: React.ComponentType<any>;
}

export interface OnboardingUseCase {
  title: string;
  description: string;
  steps: IOnboardingStep[];
  Demo: React.ComponentType<any>;
  BottomSection?: React.ComponentType<any>;
}
