import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SLACK_OVERRIDE_KEYS } from '../src/consts/providers/provider-overrides/slack/keys';
import { slackOverrideJsonSchema } from '../src/consts/providers/provider-overrides/slack/slack-override.generated';
import { slackOverrideLiquidTolerantJsonSchema } from '../src/consts/providers/provider-overrides/slack/slack-override.liquid-tolerant.generated';
import { buildSlackOverrideSchemas } from './generate-slack-override-schema';

const REGENERATE_HINT = 'Run `pnpm --filter @novu/shared generate:slack-schema` and commit the result.';
const sharedRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('generated Slack override schema', () => {
  const regenerated = buildSlackOverrideSchemas();

  it(`matches the committed artifact. ${REGENERATE_HINT}`, () => {
    expect(slackOverrideJsonSchema).toEqual(regenerated.schema);
  });

  it(`matches the committed liquid-tolerant artifact. ${REGENERATE_HINT}`, () => {
    expect(slackOverrideLiquidTolerantJsonSchema).toEqual(regenerated.liquidTolerantSchema);
  });

  it('keeps the hand-written key list in step with the schema', () => {
    expect([...SLACK_OVERRIDE_KEYS]).toEqual(Object.keys(slackOverrideJsonSchema.properties ?? {}));
  });

  it('never exposes the routing fields Novu resolves itself', () => {
    const properties = slackOverrideJsonSchema.properties ?? {};

    expect(properties.channel).toBeUndefined();
    expect(properties.token).toBeUndefined();
    expect(properties.as_user).toBeUndefined();
  });

  it('resolves every internal reference so AJV can compile it standalone', () => {
    for (const schema of [slackOverrideJsonSchema, slackOverrideLiquidTolerantJsonSchema]) {
      const defined = new Set(Object.keys(schema.definitions ?? {}));
      const referenced = [...JSON.stringify(schema).matchAll(/#\/definitions\/([^"]+)"/g)].map(([, name]) =>
        decodeURIComponent(name as string)
      );

      expect(referenced.filter((name) => !defined.has(name))).toEqual([]);
    }
  });

  it('keeps the full schema out of the package barrel so it is not bundled eagerly', () => {
    const barrel = readFileSync(join(sharedRoot, 'src/consts/providers/provider-overrides/index.ts'), 'utf8');

    expect(barrel).not.toContain('slack-override.generated');
    expect(barrel).not.toContain('slack-override.liquid-tolerant.generated');
    expect(barrel).not.toMatch(/from '\.\/slack'/);
  });
});
