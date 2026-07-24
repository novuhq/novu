import { jsonrepair } from 'jsonrepair';

import { createLiquidEngine } from './liquid.utils';

export function repairJsonString(value: string): string {
  return jsonrepair(value);
}

export async function compileJsonControlValues(
  values: Record<string, unknown>,
  context: Record<string, unknown>,
  liquidEngine: ReturnType<typeof createLiquidEngine> = createLiquidEngine()
): Promise<Record<string, unknown>> {
  const compiled = await liquidEngine.parseAndRender(JSON.stringify(values), context);

  try {
    return JSON.parse(jsonrepair(compiled)) as Record<string, unknown>;
  } catch {
    throw new Error('Rendered template output is not valid JSON');
  }
}
