import { createLiquidEngine } from '@novu/framework/internal';

export const buildLiquidParser = () => {
  return createLiquidEngine({
    strictVariables: true,
    strictFilters: true,
    greedy: false,
    catchAllErrors: true,
  });
};
