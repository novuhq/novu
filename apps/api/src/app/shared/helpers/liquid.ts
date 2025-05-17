import { createLiquidEngine } from '@novu/framework/internal';

export const parseLiquid = async (value: string, variables: object): Promise<string> => {
  const client = createLiquidEngine();
  const template = client.parse(value);

  return await client.render(template, variables);
};
