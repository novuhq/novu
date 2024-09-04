import { expect, test, describe } from 'vitest';
import { SDK_VERSION } from './version.constants';

describe('version', () => {
  test('should export the current version', () => {
    const importVersion = SDK_VERSION;
    // eslint-disable-next-line global-require
    const packageJsonVersion = require('../../package.json').version;
    expect(importVersion).toEqual(packageJsonVersion);
  });
});
