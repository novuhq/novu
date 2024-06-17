import { expect, test, describe } from 'vitest';
import { VERSION } from './version';

describe('version', () => {
  test('should export the current version', () => {
    const importVersion = VERSION;
    const packageJsonVersion = require('../package.json').version;
    expect(importVersion).toEqual(packageJsonVersion);
  });
});
