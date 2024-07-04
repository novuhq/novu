import { expect, test, describe } from 'vitest';
import { SDK_VERSION } from './version';

describe('version', () => {
  test('should export the current version', () => {
    const importVersion = SDK_VERSION;
    const packageJsonVersion = require('../package.json').version;
    expect(importVersion).toEqual(packageJsonVersion);
  });
});
