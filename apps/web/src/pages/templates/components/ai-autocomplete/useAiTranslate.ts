import { useMutation } from '@tanstack/react-query';

import { getAiTranslation } from '../../../../api/auto-suggestions';

export const useAiTranslate = ({ onSuccess }) => {
  const { mutate: aiTranslate, ...rest } = useMutation<any, any, { prompt: string; dstLanguage: string }>(
    ({ prompt, dstLanguage }) => getAiTranslation({ prompt, dstLanguage }),
    { onSuccess }
  );

  return { aiTranslate, ...rest };
};
