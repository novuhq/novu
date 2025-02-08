import { Liquid } from 'liquidjs';
import { FilterWithParam } from '../types';

const engine = new Liquid();

function parseInputValue(value: string): any {
  try {
    // Try to parse as JSON
    return JSON.parse(value);
  } catch {
    // If it fails, return as string
    return value;
  }
}

export async function processFilters(value: string, filters: FilterWithParam[]): Promise<string> {
  // Parse the initial input value
  const parsedValue = parseInputValue(value);

  // Create the liquid template by applying filters
  const filterString = filters
    .map((filter) => {
      if (!filter.params?.length) {
        return filter.value;
      }
      return `${filter.value}: ${filter.params.map((param) => `"${param}"`).join(', ')}`;
    })
    .join(' | ');

  const template = `{{ value ${filterString ? '| ' + filterString : ''} }}`;

  try {
    // Render the template with our value
    const result = await engine.parseAndRender(template, { value: parsedValue });
    return result;
  } catch (error) {
    console.error('Error processing liquid filters:', error);
    return String(parsedValue);
  }
}
