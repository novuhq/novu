import { useQuery } from '@tanstack/react-query';

import { getInAppActivated } from '../integration';
import { QueryKeys } from '../query.keys';

interface IGetInAppActivatedResponse {
  active: boolean;
}

export const useInAppActivated = () => {
  const {
    data: { active },
    ...rest
  } = useQuery<IGetInAppActivatedResponse>([QueryKeys.getInAppActive], async () => getInAppActivated(), {
    refetchInterval: (data) => (data?.active ? false : 3000),
    initialData: { active: false },
  });

  return {
    isInAppActive: active,
    ...rest,
  };
};
