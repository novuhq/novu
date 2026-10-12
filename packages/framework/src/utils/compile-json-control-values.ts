import { jsonrepair } from 'jsonrepair';
import { Liquid } from 'liquidjs';

import { createLiquidEngine } from './liquid.utils';

export function repairJsonString(value: string): string {
  return jsonrepair(value);
}

/**
 * Renders a JSON document with Liquid.
 *
 * JSON.stringify encodes newlines, carriage returns, and tabs as `\n`, `\r`, and `\t`.
 * Liquid whitespace tags (`{%-` / `-%}`) only trim real whitespace, so those escapes are
 * restored before render and any whitespace Liquid did not trim is escaped again.
 * Literal backslash sequences (`\\n`) are left unchanged.
 */
export async function renderLiquidJson(liquidEngine: Liquid, json: string, context: object): Promise<string> {
  const compiled = await liquidEngine.parseAndRender(unescapeJsonWhitespace(json), context);

  return escapeJsonWhitespace(compiled);
}

export async function compileJsonControlValues(
  values: Record<string, unknown>,
  context: Record<string, unknown>,
  liquidEngine: Liquid = createLiquidEngine()
): Promise<Record<string, unknown>> {
  const compiled = await renderLiquidJson(liquidEngine, JSON.stringify(values), context);

  try {
    return JSON.parse(jsonrepair(compiled)) as Record<string, unknown>;
  } catch {
    throw new Error('Rendered template output is not valid JSON');
  }
}

function unescapeJsonWhitespace(value: string): string {
  let result = '';

  for (let index = 0; index < value.length; index++) {
    if (value[index] !== '\\' || index + 1 >= value.length) {
      result += value[index];
      continue;
    }

    const next = value[index + 1];
    if (next === 'n') {
      result += '\n';
      index++;
      continue;
    }

    if (next === 'r') {
      result += '\r';
      index++;
      continue;
    }

    if (next === 't') {
      result += '\t';
      index++;
      continue;
    }

    if (next === '\\') {
      result += '\\\\';
      index++;
      continue;
    }

    result += `\\${next}`;
    index++;
  }

  return result;
}

function escapeJsonWhitespace(value: string): string {
  return value.replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
}
