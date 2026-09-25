import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

type Specificity = [ids: number, classes: number, types: number];

const heaviest = (list: Specificity[]): Specificity =>
  list.reduce<Specificity>(
    (max, next) => ((next[0] - max[0] || next[1] - max[1] || next[2] - max[2]) > 0 ? next : max),
    [0, 0, 0]
  );

/** Splits a selector list on its top-level commas. */
const splitSelectorList = (list: string) => postcss.list.comma(list);

/**
 * The specificity of a selector, per Selectors Level 4: `:where()` adds nothing, and `:is()`, `:not()` and `:has()`
 * add their heaviest argument. Enough for the selectors in `index.css`; not a general CSS parser.
 */
const specificity = (selector: string): Specificity => {
  const total: Specificity = [0, 0, 0];
  let index = 0;
  const readName = () => {
    const name = /^(?:\\.|[\w-])+/.exec(selector.slice(index))?.[0] ?? '';
    index += name.length;

    return name;
  };
  const readArguments = () => {
    const start = index;
    let depth = 0;
    do {
      if (selector[index] === '(') depth += 1;
      if (selector[index] === ')') depth -= 1;
      index += 1;
    } while (depth > 0 && index < selector.length);

    return selector.slice(start + 1, index - 1);
  };

  while (index < selector.length) {
    const char = selector[index];
    if (char === '#' || char === '.') {
      index += 1;
      readName();
      total[char === '#' ? 0 : 1] += 1;
    } else if (char === '[') {
      index = selector.indexOf(']', index) + 1;
      total[1] += 1;
    } else if (char === ':' && selector[index + 1] === ':') {
      index += 2;
      readName();
      total[2] += 1;
    } else if (char === ':') {
      index += 1;
      const name = readName();
      const args = selector[index] === '(' ? readArguments() : undefined;
      if (name === 'where') {
        continue;
      }
      const added: Specificity =
        args !== undefined && ['is', 'not', 'has'].includes(name)
          ? heaviest(splitSelectorList(args).map(specificity))
          : [0, 1, 0];
      total[0] += added[0];
      total[1] += added[1];
      total[2] += added[2];
    } else if (/[a-zA-Z]/.test(char)) {
      readName();
      total[2] += 1;
    } else {
      // Combinators, whitespace and `*` add nothing.
      index += 1;
    }
  }

  return total;
};

const stylesheet = postcss.parse(readFileSync(resolve(__dirname, '../../index.css'), 'utf8'));

const recipeSelectors = () => {
  const selectors: string[] = [];
  stylesheet.walkAtRules('layer', (layer) => {
    layer.walkRules((rule) => {
      selectors.push(...rule.selectors);
    });
  });

  return selectors;
};

describe('motion recipes', () => {
  it('computes the specificity the guard below relies on', () => {
    expect(specificity(':where(.nt-motion-panel, .nt-motion-menu)[data-state="open"]')).toEqual([0, 1, 0]);
    expect(specificity(':is(.nt-motion-panel, .nt-motion-menu)[data-state="open"]')).toEqual([0, 2, 0]);
    expect(specificity(':where([data-nv-motion="full"] .nt-tab[data-state="active"])::after')).toEqual([0, 0, 1]);
    expect(specificity('.nt-group:hover .nt-motion-reveal')).toEqual([0, 3, 0]);
  });

  it('weigh no more than a single class, so a host style on the same element overrides them', () => {
    const recipes = recipeSelectors();
    expect(recipes.length).toBeGreaterThan(0);

    const heavierThanAClass = recipes
      // The hover reveal keeps the weight of the `group-hover` utilities it replaced.
      .filter((selector) => !selector.includes('.nt-motion-reveal'))
      .filter((selector) => {
        const [ids, classes] = specificity(selector);

        return ids > 0 || classes > 1;
      });

    expect(heavierThanAClass).toEqual([]);
  });
});
