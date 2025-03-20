import { useMemo } from 'react';
import { RQBJsonLogic } from 'react-querybuilder';

import { countConditions } from '@/utils/conditions';

export const useConditionsCount = (jsonLogic?: RQBJsonLogic) => {
  return useMemo(() => countConditions(jsonLogic), [jsonLogic]);
};
