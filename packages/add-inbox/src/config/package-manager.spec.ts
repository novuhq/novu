import { beforeEach, expect, test, vi } from 'vitest';
import { PACKAGE_MANAGERS } from '../constants';
import fileUtils from '../utils/file';
import logger from '../utils/logger';
import { detectPackageManager } from './package-manager';

vi.mock('../utils/logger', () => ({
  default: {
    warning: vi.fn(),
  },
}));

vi.mock('../utils/file', async (importOriginal) => {
  const original = await importOriginal<typeof import('../utils/file')>();

  original.default.exists = vi.fn();

  return original;
});

beforeEach(() => {
  vi.mocked(fileUtils.exists).mockClear();
});

test('should default to npm if no package manager is detected', async () => {
  const packageManager = detectPackageManager();

  expect(logger.warning).toHaveBeenCalledWith('  • No package manager detected, defaulting to npm');

  expect(packageManager).toBeDefined();
  expect(packageManager.name).toBe(PACKAGE_MANAGERS.NPM);
});

test('should detect package manager correctly with override', async () => {
  const packageManager = detectPackageManager(PACKAGE_MANAGERS.PNPM);

  expect(packageManager).toBeDefined();
  expect(packageManager.name).toBe(PACKAGE_MANAGERS.PNPM);
});

test('should warn if detected package manager does not match the provided package manager', async () => {
  // Mimic the existence of a pnpm-lock.yaml file
  vi.mocked(fileUtils.exists).mockImplementation((filePath) => filePath.includes('pnpm-lock.yaml'));

  const detected = PACKAGE_MANAGERS.PNPM;
  const provided = PACKAGE_MANAGERS.YARN;

  const packageManager = detectPackageManager(provided);

  expect(packageManager).toBeDefined();
  expect(packageManager.name).toBe(provided);

  expect(logger.warning).toHaveBeenCalledWith(
    `  • Detected package manager ${detected} does not match the provided package manager ${provided}, which could lead to unexpected behavior`
  );
});
