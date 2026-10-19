import { createLiquidEngine } from '@novu/framework/internal';

/** These tags load template files, which Novu does not have, so they always fail at render. */
const FILE_TAGS = ['include', 'render', 'layout'];

export const buildLiquidParser = () => {
  return createLiquidEngine({
    strictVariables: true,
    strictFilters: true,
    greedy: false,
    catchAllErrors: true,
  });
};

/** Strict parser for step issues: also rejects tags that parse but can never render. */
export const buildLiquidValidator = () => {
  const engine = buildLiquidParser();

  for (const tag of FILE_TAGS) {
    engine.registerTag(tag, {
      parse() {
        throw new Error(`tag "${tag}" is not supported`);
      },
      render() {},
    });
  }

  return engine;
};
