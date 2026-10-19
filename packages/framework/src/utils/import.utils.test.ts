import { describe, expect, it } from 'vitest';
import { checkDependencies } from './import.utils';

describe('import utils', () => {
  describe('checkDependencies', () => {
    it('should not throw an error if all dependencies are installed', async () => {
      await expect(
        checkDependencies(
          [{ name: 'typescript', import: import('typescript'), exports: ['tokenToString'] }],
          'test schema'
        )
      ).resolves.not.toThrow();
    });

    it('should throw an error if a single dependency is not installed', async () => {
      await expect(
        checkDependencies(
          // @ts-expect-error - Cannot find module 'missing-random-dependency' or its corresponding type declarations.
          [{ name: 'missing-random-dependency', import: import('missing-random-dependency'), exports: [] }],
          'test schema'
        )
      ).rejects.toThrow(
        'Tried to use a test schema in @novu/framework without missing-random-dependency installed. Please install it by running `npm install missing-random-dependency`.'
      );
    });

    it('should throw an error if multiple dependencies are not installed', async () => {
      await expect(
        checkDependencies(
          [
            // @ts-expect-error - Cannot find module 'missing-random-dependency-1' or its corresponding type declarations.
            { name: 'missing-random-dependency-1', import: import('missing-random-dependency-1'), exports: [] },
            // @ts-expect-error - Cannot find module 'missing-random-dependency-2' or its corresponding type declarations.
            { name: 'missing-random-dependency-2', import: import('missing-random-dependency-2'), exports: [] },
          ],
          'test schema'
        )
      ).rejects.toThrow(
        'Tried to use a test schema in @novu/framework without missing-random-dependency-1, missing-random-dependency-2 installed. Please install them by running `npm install missing-random-dependency-1 missing-random-dependency-2`.'
      );
    });

    it('should throw an error listing a single dependency that is not installed when using a root and non-root import', async () => {
      await expect(
        checkDependencies(
          [
            // @ts-expect-error - Cannot find module 'missing-random-dependency' or its corresponding type declarations.
            { name: 'missing-random-dependency', import: import('missing-random-dependency'), exports: [] },
            // @ts-expect-error - Cannot find module 'missing-random-dependency/nested' or its corresponding type declarations.
            { name: 'missing-random-dependency', import: import('missing-random-dependency/nested'), exports: [] },
          ],
          'test schema'
        )
      ).rejects.toThrow(
        'Tried to use a test schema in @novu/framework without missing-random-dependency installed. Please install it by running `npm install missing-random-dependency`.'
      );
    });
  });
});
