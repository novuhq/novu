import { expect } from 'chai';
import { isSafeDotBracketPath, parseDotBracketPath, safeSetPath } from './safe-set-path';

describe('safeSetPath', () => {
  it('should set nested dot-notation paths', () => {
    const root: Record<string, unknown> = {};

    safeSetPath(root, 'payload.user.name', 'name');

    expect(root).to.deep.equal({
      payload: {
        user: {
          name: 'name',
        },
      },
    });
  });

  it('should set bracket-notation paths', () => {
    const root: Record<string, unknown> = {};

    safeSetPath(root, 'payload.items[0].name', 'fallback');

    expect(root).to.deep.equal({
      payload: {
        items: [{ name: 'fallback' }],
      },
    });
  });

  it('should set chained bracket-notation paths', () => {
    const root: Record<string, unknown> = {};

    safeSetPath(root, 'data.matrix[0][1]', 'fallback');

    expect(root).to.deep.equal({
      data: {
        matrix: [[undefined, 'fallback']],
      },
    });
  });

  it('should not traverse into an existing scalar value', () => {
    const root: Record<string, unknown> = { user: 'scalar-user' };

    safeSetPath(root, 'user.firstName', 'John');

    expect(root).to.deep.equal({ user: 'scalar-user' });
  });

  it('should ignore unsafe path segments', () => {
    const root: Record<string, unknown> = {};
    const toStringCall = Object.prototype.toString.call;

    safeSetPath(root, 'toString.call', [{}]);
    safeSetPath(root, 'payload.toString.call', [{}]);

    expect(root).to.deep.equal({});
    expect(Object.prototype.toString.call).to.equal(toStringCall);
    expect(typeof Object.prototype.toString.call).to.equal('function');
  });

  it('should ignore prototype pollution segments', () => {
    const root: Record<string, unknown> = {};

    safeSetPath(root, '__proto__.polluted', 'yes');
    safeSetPath(root, 'constructor.prototype.polluted', 'yes');

    expect(({} as Record<string, unknown>).polluted).to.equal(undefined);
    expect(root).to.deep.equal({});
  });
});

describe('parseDotBracketPath', () => {
  it('should expand bracket indices into segments', () => {
    expect(parseDotBracketPath('payload.items[0].products[1].name')).to.deep.equal([
      'payload',
      'items',
      '0',
      'products',
      '1',
      'name',
    ]);
  });
});

describe('isSafeDotBracketPath', () => {
  it('should reject unsafe segments', () => {
    expect(isSafeDotBracketPath('payload.name')).to.equal(true);
    expect(isSafeDotBracketPath('toString.call')).to.equal(false);
    expect(isSafeDotBracketPath('')).to.equal(false);
  });
});
