import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

// runs a clean after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});
