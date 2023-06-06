import { useQuery } from '@tanstack/react-query';

import { getAiAutosuggestions } from '../../../../api/auto-suggestions';

interface AiSuggestions {
  answer: Array<{ content: string }>;
}

interface AiSuggestionsPrompt {
  isEnabled: boolean;
  value: string;
  title: string;
  channel: string;
}

const TEN_MINUTES = 1000 * 60 * 10;

export const useAiAutosuggestions = ({ isEnabled, value, channel, title }: AiSuggestionsPrompt) => {
  const { data, ...rest } = useQuery<AiSuggestions>(
    ['ai-autosuggestions', value],
    () => getAiAutosuggestions({ description: value, channel, title }),
    {
      enabled: isEnabled,
      cacheTime: TEN_MINUTES,
      staleTime: TEN_MINUTES,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    }
  );

  return { aiSuggestions: data, ...rest };
};
