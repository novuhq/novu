import { describe, expect, it } from 'vitest';
import { validateConfig } from './schema';

describe('validateConfig', () => {
  describe('valid configs', () => {
    it('should accept an empty config object', () => {
      expect(() => validateConfig({})).not.toThrow();
    });

    it('should accept config with all optional fields', () => {
      const config = {
        outDir: './novu',
        apiUrl: 'https://api.novu.co',
        aliases: {
          '@emails': './src/emails',
        },
      };

      expect(() => validateConfig(config)).not.toThrow();
      const result = validateConfig(config);
      expect(result.outDir).toBe('./novu');
      expect(result.apiUrl).toBe('https://api.novu.co');
    });

    it('should accept config with only aliases', () => {
      const config = {
        aliases: {
          '@components': './src/components',
          '@utils': './src/utils',
        },
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    it('should accept config with only outDir', () => {
      expect(() => validateConfig({ outDir: './custom-novu' })).not.toThrow();
    });
  });

  describe('invalid configs', () => {
    it('should reject non-object config', () => {
      expect(() => validateConfig(null)).toThrow('Invalid config: must be an object');
      expect(() => validateConfig(undefined)).toThrow('Invalid config: must be an object');
      expect(() => validateConfig('string')).toThrow('Invalid config: must be an object');
      expect(() => validateConfig(123)).toThrow('Invalid config: must be an object');
    });

    it('should reject invalid outDir type', () => {
      expect(() => validateConfig({ outDir: 123 })).toThrow('outDir must be a string');
    });

    it('should reject invalid apiUrl type', () => {
      expect(() => validateConfig({ apiUrl: true })).toThrow('apiUrl must be a string');
    });

    it('should reject invalid aliases type', () => {
      expect(() => validateConfig({ aliases: 'invalid' })).toThrow('aliases must be an object');
    });

    it('should reject alias target with non-string value', () => {
      expect(() => validateConfig({ aliases: { '@emails': 123 } })).toThrow("aliases['@emails'] must be a string");
    });

    it('should reject alias target with empty string value', () => {
      expect(() => validateConfig({ aliases: { '@emails': '   ' } })).toThrow("aliases['@emails'] cannot be empty");
    });

    it('should collect multiple errors', () => {
      expect(() => validateConfig({ outDir: 123, apiUrl: true })).toThrow('Configuration validation errors:');
    });
  });
});
