import { describe, expect, it } from 'vitest';
import { getAtPath, setAtPath } from './path';

describe('path helpers', () => {
  it('reads and writes dotted paths without clobbering siblings', () => {
    const next = setAtPath({ text: { preview_url: true } }, 'text.body', 'hello');

    expect(next).toEqual({ text: { preview_url: true, body: 'hello' } });
    expect(getAtPath(next, 'text.body')).toBe('hello');
  });

  it('ignores prototype-polluting path segments', () => {
    const polluted = setAtPath({}, '__proto__.polluted', true);
    expect(polluted).toEqual({});
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();

    const viaConstructor = setAtPath({}, 'constructor.prototype.polluted', true);
    expect(viaConstructor).toEqual({});

    expect(
      getAtPath({ __proto__: { polluted: true } } as Record<string, unknown>, '__proto__.polluted')
    ).toBeUndefined();
  });
});
