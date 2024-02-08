import { ProductUseCasesEnum } from '@novu/shared';

export type OnboardingUseCases = {
  [key in ProductUseCasesEnum]: OnboardingUseCase;
};

export interface IOnboardingStep {
  title: string;
  Description: React.ComponentType<any>;
}

export interface OnboardingUseCase {
  title: string;
  description: string;
  steps: IOnboardingStep[];
  Demo: React.ComponentType<any>;
}
