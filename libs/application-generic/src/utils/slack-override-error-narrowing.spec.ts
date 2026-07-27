import { slackOverrideLiquidTolerantJsonSchema } from '@novu/shared/provider-overrides/slack';
import { describe, expect, it } from 'vitest';
import { JSONSchemaDto } from '../dtos/json-schema.dto';
import { createLiquidTolerantValidator } from './liquid-tolerant-validator';

type SchemaNode = {
  $ref?: string;
  anyOf?: SchemaNode[];
  oneOf?: SchemaNode[];
  const?: string;
  properties?: Record<string, SchemaNode>;
  definitions?: Record<string, SchemaNode>;
};

function definitionKeyOf(ref: string): string {
  return decodeURIComponent(ref.replace('#/definitions/', ''));
}

/**
 * Walks a block definition looking for the first `properties.type` string const. Nested anyOf
 * (ImageBlock's image_url vs slack_file variants) and the liquid-tolerance wrapper are both fine —
 * every variant of one block shares the same discriminator.
 */
function extractBlockTypeConst(node: SchemaNode | undefined): string | undefined {
  if (!node) {
    return undefined;
  }

  const typeConst = node.properties?.type?.const ?? node.properties?.type?.anyOf?.find((branch) => branch.const)?.const;
  if (typeof typeConst === 'string') {
    return typeConst;
  }

  for (const branch of node.anyOf ?? node.oneOf ?? []) {
    const found = extractBlockTypeConst(branch);
    if (found) {
      return found;
    }
  }

  return undefined;
}

function knownBlockEntries(schema: SchemaNode): Array<{ definitionKey: string; blockType: string }> {
  const knownBlock = schema.definitions?.KnownBlock;
  const refs =
    knownBlock?.anyOf
      ?.flatMap((branch) => branch.anyOf ?? [branch])
      .map((branch) => branch.$ref)
      .filter((ref): ref is string => typeof ref === 'string' && ref.startsWith('#/definitions/')) ?? [];

  return refs.map((ref) => {
    const definitionKey = definitionKeyOf(ref);
    const blockType = extractBlockTypeConst(schema.definitions?.[definitionKey]);
    if (!blockType) {
      throw new Error(`Could not extract type const from ${definitionKey}`);
    }

    return { definitionKey, blockType };
  });
}

describe('Slack override error narrowing (real schema)', () => {
  const schema = slackOverrideLiquidTolerantJsonSchema as unknown as JSONSchemaDto;
  const validate = createLiquidTolerantValidator(schema);
  const blocks = knownBlockEntries(schema as unknown as SchemaNode);

  it('discovers KnownBlock members from the generated schema without a hand-maintained list', () => {
    expect(blocks.length).toBeGreaterThan(10);
    expect(new Set(blocks.map((block) => block.blockType)).size).toBe(blocks.length);
    expect(blocks.some((block) => block.blockType === 'actions' && block.definitionKey === 'ActionsBlock')).toBe(true);
    expect(blocks.some((block) => block.blockType === 'image' && block.definitionKey === 'ImageBlock')).toBe(true);
  });

  it.each(blocks)(
    'keeps errors for type "$blockType" inside $definitionKey (no sibling block leakage)',
    ({ definitionKey, blockType }) => {
      const errors = validate({ blocks: [{ type: blockType }] });
      const foreign = errors.filter(
        (error) =>
          error.schemaPath.includes('/definitions/') &&
          !error.schemaPath.includes(`/definitions/${definitionKey}/`) &&
          !error.schemaPath.includes('/definitions/KnownBlock/')
      );

      expect(foreign.map((error) => error.schemaPath)).toEqual([]);
    }
  );

  it('reports only the missing elements field for an incomplete actions block', () => {
    const errors = validate({ blocks: [{ type: 'actions' }] });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      instancePath: '/blocks/0',
      keyword: 'required',
      params: { missingProperty: 'elements' },
    });
  });
});
