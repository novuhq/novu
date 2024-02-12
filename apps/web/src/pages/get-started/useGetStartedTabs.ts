import { ProductUseCasesEnum } from '@novu/shared';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { OnboardingUseCasesTabsEnum } from '../../constants/onboarding-tabs';
import { ROUTES } from '../../constants/routes.enum';
import { OnboardingParams } from './types';

interface IUseGetStartedTabsProps {
  usecase: ProductUseCasesEnum;
}

export const useGetStartedTabs = ({ usecase }: IUseGetStartedTabsProps) => {
  const navigate = useNavigate();
  const { usecase: usecaseParam } = useParams<Record<OnboardingParams, OnboardingUseCasesTabsEnum | undefined>>();

  const usecaseToUse = (usecase || usecaseParam?.replace('-', '_')) as ProductUseCasesEnum | undefined;

  /*
   * This will redirect to the in-app tab if the use case is not provided in the parameters and component input.
   * * This state should not occur; it was added as a precautionary measure.
   */
  useEffect(() => {
    if (!usecaseToUse) {
      navigate(`${ROUTES.GET_STARTED}/${OnboardingUseCasesTabsEnum.IN_APP}`);
    }
  }, [navigate, usecaseToUse]);

  if (!usecase) {
    return null;
  }
};
