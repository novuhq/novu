import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// runs a clean after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});
