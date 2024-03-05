import { GetStartedTabsViewsEnum } from './GetStartedTabsViewsEnum';
import { OnboardingUseCasesTabsEnum } from './OnboardingUseCasesTabsEnum';

export type OnboardingUseCases = Record<OnboardingUseCasesTabsEnum, OnboardingUseCase>;

export interface IOnboardingUseCaseViewContext {
  setView: (view: GetStartedTabsViewsEnum | null) => void;
  currentView?: GetStartedTabsViewsEnum;
}

type UseCaseViewContext = Partial<IOnboardingUseCaseViewContext>;

export interface IOnboardingStep {
  title: string;
  Description: React.ComponentType<UseCaseViewContext>;
}

export enum OnboardingWorkflowRouteEnum {
  IN_APP = 'in_app',
  DELAY = 'delay',
  DIGEST = 'digest',
  TEST_WORKFLOW = 'test-workflow',
}

export interface OnboardingUseCase {
  title: string;
  description?: string;
  steps: IOnboardingStep[];
  useCaseLink: string;
  type: OnboardingUseCasesTabsEnum;
  Demo: React.ComponentType<UseCaseViewContext>;
  BottomSection?: React.ComponentType<UseCaseViewContext>;
  views?: Partial<Record<GetStartedTabsViewsEnum, OnboardingUseCase>>;
}
