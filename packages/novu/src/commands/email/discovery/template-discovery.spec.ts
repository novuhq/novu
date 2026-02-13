import path from 'path';
import { describe, expect, it } from 'vitest';
import { discoverEmailTemplates } from './template-discovery';

const fixturesDir = path.join(__dirname, '../__fixtures__/templates');

describe('discoverEmailTemplates', () => {
  it('should find templates with default export and React Email imports', async () => {
    const templates = await discoverEmailTemplates(fixturesDir);

    const validTemplate = templates.find((t) => t.relativePath.includes('valid-template'));
    expect(validTemplate).toBeDefined();
  });

  it('should ignore test files', async () => {
    const templates = await discoverEmailTemplates(fixturesDir);

    const testFile = templates.find((t) => t.relativePath.includes('test-file.test'));
    expect(testFile).toBeUndefined();
  });

  it('should ignore files without default export', async () => {
    const templates = await discoverEmailTemplates(fixturesDir);

    const noDefault = templates.find((t) => t.relativePath.includes('no-default-export'));
    expect(noDefault).toBeUndefined();
  });

  it('should ignore files without React Email imports', async () => {
    const templates = await discoverEmailTemplates(fixturesDir);

    const noReactEmail = templates.find((t) => t.relativePath.includes('no-react-email'));
    expect(noReactEmail).toBeUndefined();
  });

  it('should return templates with correct structure', async () => {
    const templates = await discoverEmailTemplates(fixturesDir);

    expect(templates.length).toBeGreaterThan(0);
    const template = templates[0];
    expect(template).toHaveProperty('filePath');
    expect(template).toHaveProperty('relativePath');
  });

  it('should handle empty directory', async () => {
    const tempDir = path.join(__dirname, '../__fixtures__/empty');
    const templates = await discoverEmailTemplates(tempDir);

    expect(Array.isArray(templates)).toBe(true);
  });
});
