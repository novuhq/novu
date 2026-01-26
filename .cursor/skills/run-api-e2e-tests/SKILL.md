---
name: run-api-e2e-tests
description: Run e2e tests for the API service. Use when the user wants to run API E2E tests.
---

# Run API E2E Tests

Run novu-v2 e2e tests for the API service. Tests are located in `apps/api`.

## Running All Tests

```bash
pnpm test:e2e:novu-v2
```

This runs all e2e tests with the novu-v2 pattern across both regular and enterprise test suites.

## Running a Specific Test

When the user mentions a specific test or feature:

1. **Find the test file** using Glob with pattern `*.e2e.ts` or `*.e2e-ee.ts` in `apps/api`
2. **Extract the filename** (without extension) - e.g., `trigger-event-preferences.e2e.ts` → `trigger-event-preferences`
3. **Determine the test location:**
   - Check if the test is in `src/` or `e2e/enterprise/`
4. **Run the full mocha command** replacing `<name-of-the-test>` with the test name:

**Base command structure:**
```bash
pnpm exec cross-env NODE_ENV=test CI_EE_TEST=true CLERK_ENABLED=true NODE_OPTIONS=--max_old_space_size=8192 mocha --timeout 30000 --retries 3 --grep '#novu-v2' --require ./swc-register.js --exit --file e2e/setup.ts 'src/**/<name-of-the-test>.e2e{,-ee}.ts' 'e2e/enterprise/**/<name-of-the-test>.e2e.ts'
```

- If test is in `src/`, replace `<name-of-the-test>` in the first path: `'src/**/<test-name>.e2e{,-ee}.ts'`
- If test is in `e2e/enterprise/`, replace `<name-of-the-test>` in the second path: `'e2e/enterprise/**/<test-name>.e2e.ts'`

## Examples

**Running trigger-event-preferences test (in src/):**
```bash
# Found: apps/api/src/app/events/e2e/trigger-event-preferences.e2e.ts
pnpm exec cross-env NODE_ENV=test CI_EE_TEST=true CLERK_ENABLED=true NODE_OPTIONS=--max_old_space_size=8192 mocha --timeout 30000 --retries 3 --grep '#novu-v2' --require ./swc-register.js --exit --file e2e/setup.ts 'src/**/trigger-event-preferences.e2e{,-ee}.ts' 'e2e/enterprise/**/*.e2e.ts'
```

**Running enterprise billing test:**
```bash
# Found: apps/api/e2e/enterprise/billing/billing.e2e.ts
pnpm exec cross-env NODE_ENV=test CI_EE_TEST=true CLERK_ENABLED=true NODE_OPTIONS=--max_old_space_size=8192 mocha --timeout 30000 --retries 3 --grep '#novu-v2' --require ./swc-register.js --exit --file e2e/setup.ts 'src/**/*.e2e{,-ee}.ts' 'e2e/enterprise/**/billing.e2e.ts'
```

## Important Notes

- Always run commands from `apps/api` directory
- For specific tests, use the full mocha command (not pnpm script) to target the exact test file
- Report test results clearly to the user
