import { ProductUseCasesEnum } from '@novu/shared';

import { OnboardingUseCases } from './types';
import { InAppUseCaseConst } from './InAppUseCase.const';
import { MultiChannelUseCaseConst } from './MultiChannelUseCase.const';
import { DelayUseCaseConst } from './DelayUseCase.const';
import { TranslationUseCaseConst } from './TranslationUseCase.const';
import { DigestUseCaseConst } from './DigestUseCase.const';

export const UseCasesConst: OnboardingUseCases = {
  [ProductUseCasesEnum.IN_APP]: InAppUseCaseConst,
  [ProductUseCasesEnum.MULTI_CHANNEL]: MultiChannelUseCaseConst,
  [ProductUseCasesEnum.DELAY]: DelayUseCaseConst,
  [ProductUseCasesEnum.TRANSLATION]: TranslationUseCaseConst,
  [ProductUseCasesEnum.DIGEST]: DigestUseCaseConst,
};
