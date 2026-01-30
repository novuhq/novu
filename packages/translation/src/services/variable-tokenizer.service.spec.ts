import { VariableTokenizerService } from './variable-tokenizer.service';

describe('VariableTokenizerService', () => {
  let service: VariableTokenizerService;

  beforeEach(() => {
    service = new VariableTokenizerService();
  });

  describe('tokenize', () => {
    it('should handle empty content', () => {
      const result = service.tokenize('');

      expect(result.tokenized).toBe('');
      expect(result.variableMap.size).toBe(0);
      expect(result.variables).toEqual([]);
    });

    it('should handle null content', () => {
      const result = service.tokenize(null as unknown as string);

      expect(result.tokenized).toBeNull();
      expect(result.variableMap.size).toBe(0);
      expect(result.variables).toEqual([]);
    });

    it('should handle content without variables', () => {
      const content = 'Hello World!';
      const result = service.tokenize(content);

      expect(result.tokenized).toBe('Hello World!');
      expect(result.variableMap.size).toBe(0);
      expect(result.variables).toEqual([]);
    });

    it('should tokenize single variable', () => {
      const content = 'Hello {{name}}!';
      const result = service.tokenize(content);

      expect(result.tokenized).toBe('Hello [VAR_1]!');
      expect(result.variableMap.get('[VAR_1]')).toBe('{{name}}');
      expect(result.variables).toEqual(['{{name}}']);
    });

    it('should tokenize multiple different variables', () => {
      const content = 'Hello {{firstName}} {{lastName}}!';
      const result = service.tokenize(content);

      expect(result.tokenized).toBe('Hello [VAR_1] [VAR_2]!');
      expect(result.variableMap.get('[VAR_1]')).toBe('{{firstName}}');
      expect(result.variableMap.get('[VAR_2]')).toBe('{{lastName}}');
      expect(result.variables).toEqual(['{{firstName}}', '{{lastName}}']);
    });

    it('should reuse token for duplicate variables', () => {
      const content = '{{name}} said hello to {{name}}';
      const result = service.tokenize(content);

      expect(result.tokenized).toBe('[VAR_1] said hello to [VAR_1]');
      expect(result.variableMap.size).toBe(1);
      expect(result.variableMap.get('[VAR_1]')).toBe('{{name}}');
      expect(result.variables).toEqual(['{{name}}']);
    });

    it('should tokenize nested variables', () => {
      const content = '{{user.profile.name}} - {{user.email}}';
      const result = service.tokenize(content);

      expect(result.tokenized).toBe('[VAR_1] - [VAR_2]');
      expect(result.variableMap.get('[VAR_1]')).toBe('{{user.profile.name}}');
      expect(result.variableMap.get('[VAR_2]')).toBe('{{user.email}}');
    });

    it('should tokenize Handlebars helpers', () => {
      const content = '{{#if condition}}Show{{/if}}';
      const result = service.tokenize(content);

      expect(result.tokenized).toBe('[VAR_1]Show[VAR_2]');
      expect(result.variableMap.get('[VAR_1]')).toBe('{{#if condition}}');
      expect(result.variableMap.get('[VAR_2]')).toBe('{{/if}}');
    });

    it('should tokenize variables with helpers', () => {
      const content = 'Date: {{formatDate createdAt "YYYY-MM-DD"}}';
      const result = service.tokenize(content);

      expect(result.tokenized).toBe('Date: [VAR_1]');
      expect(result.variableMap.get('[VAR_1]')).toBe('{{formatDate createdAt "YYYY-MM-DD"}}');
    });

    it('should handle variables in HTML content', () => {
      const content = '<div class="greeting">Hello {{name}}!</div>';
      const result = service.tokenize(content);

      expect(result.tokenized).toBe('<div class="greeting">Hello [VAR_1]!</div>');
      expect(result.variableMap.get('[VAR_1]')).toBe('{{name}}');
    });

    it('should handle complex email template', () => {
      const content = `
        <html>
          <body>
            <h1>Welcome, {{user.name}}!</h1>
            <p>Your order #{{order.id}} has been confirmed.</p>
            <p>Total: {{formatCurrency order.total}}</p>
            <p>Thank you, {{user.name}}</p>
          </body>
        </html>
      `;
      const result = service.tokenize(content);

      expect(result.tokenized).toContain('[VAR_1]');
      expect(result.tokenized).toContain('[VAR_2]');
      expect(result.tokenized).toContain('[VAR_3]');
      // user.name should be reused
      expect(result.tokenized.match(/\[VAR_1\]/g)?.length).toBe(2);
      expect(result.variableMap.size).toBe(3);
    });

    it('should maintain token order by position', () => {
      const content = '{{c}} {{a}} {{b}} {{a}}';
      const result = service.tokenize(content);

      expect(result.tokenized).toBe('[VAR_1] [VAR_2] [VAR_3] [VAR_2]');
      expect(result.variableMap.get('[VAR_1]')).toBe('{{c}}');
      expect(result.variableMap.get('[VAR_2]')).toBe('{{a}}');
      expect(result.variableMap.get('[VAR_3]')).toBe('{{b}}');
    });
  });

  describe('detokenize', () => {
    it('should handle empty content', () => {
      const result = service.detokenize('', new Map());

      expect(result).toBe('');
    });

    it('should handle null content', () => {
      const result = service.detokenize(null as unknown as string, new Map());

      expect(result).toBeNull();
    });

    it('should handle empty variable map', () => {
      const content = 'Hello World!';
      const result = service.detokenize(content, new Map());

      expect(result).toBe('Hello World!');
    });

    it('should restore single token', () => {
      const variableMap = new Map([['[VAR_1]', '{{name}}']]);
      const result = service.detokenize('Hello [VAR_1]!', variableMap);

      expect(result).toBe('Hello {{name}}!');
    });

    it('should restore multiple tokens', () => {
      const variableMap = new Map([
        ['[VAR_1]', '{{firstName}}'],
        ['[VAR_2]', '{{lastName}}'],
      ]);
      const result = service.detokenize('Hello [VAR_1] [VAR_2]!', variableMap);

      expect(result).toBe('Hello {{firstName}} {{lastName}}!');
    });

    it('should restore duplicate tokens', () => {
      const variableMap = new Map([['[VAR_1]', '{{name}}']]);
      const result = service.detokenize('[VAR_1] said hello to [VAR_1]', variableMap);

      expect(result).toBe('{{name}} said hello to {{name}}');
    });

    it('should handle unmatched tokens gracefully', () => {
      const variableMap = new Map([['[VAR_1]', '{{name}}']]);
      const result = service.detokenize('[VAR_1] [VAR_2]', variableMap);

      expect(result).toBe('{{name}} [VAR_2]');
    });

    it('should preserve HTML structure', () => {
      const variableMap = new Map([['[VAR_1]', '{{name}}']]);
      const result = service.detokenize('<div class="greeting">Hello [VAR_1]!</div>', variableMap);

      expect(result).toBe('<div class="greeting">Hello {{name}}!</div>');
    });

    it('should handle round-trip tokenization', () => {
      const original = 'Hello {{firstName}} {{lastName}}, your order #{{orderId}} is ready!';
      const tokenized = service.tokenize(original);
      const restored = service.detokenize(tokenized.tokenized, tokenized.variableMap);

      expect(restored).toBe(original);
    });

    it('should handle round-trip with duplicates', () => {
      const original = '{{name}} - Welcome {{name}}! Your {{product}} order for {{name}} is ready.';
      const tokenized = service.tokenize(original);
      const restored = service.detokenize(tokenized.tokenized, tokenized.variableMap);

      expect(restored).toBe(original);
    });
  });

  describe('validate', () => {
    it('should pass for empty content', () => {
      const result = service.validate('');

      expect(result.valid).toBe(true);
      expect(result.unresolvedTokens).toEqual([]);
    });

    it('should pass for null content', () => {
      const result = service.validate(null as unknown as string);

      expect(result.valid).toBe(true);
      expect(result.unresolvedTokens).toEqual([]);
    });

    it('should pass for content without tokens', () => {
      const result = service.validate('Hello World!');

      expect(result.valid).toBe(true);
      expect(result.unresolvedTokens).toEqual([]);
    });

    it('should pass for content with variables but no tokens', () => {
      const result = service.validate('Hello {{name}}!');

      expect(result.valid).toBe(true);
      expect(result.unresolvedTokens).toEqual([]);
    });

    it('should fail for content with unresolved token', () => {
      const result = service.validate('Hello [VAR_1]!');

      expect(result.valid).toBe(false);
      expect(result.unresolvedTokens).toEqual(['[VAR_1]']);
    });

    it('should fail for content with multiple unresolved tokens', () => {
      const result = service.validate('Hello [VAR_1] [VAR_2]!');

      expect(result.valid).toBe(false);
      expect(result.unresolvedTokens).toEqual(['[VAR_1]', '[VAR_2]']);
    });

    it('should deduplicate unresolved tokens', () => {
      const result = service.validate('[VAR_1] said hello to [VAR_1] and [VAR_2]');

      expect(result.valid).toBe(false);
      expect(result.unresolvedTokens).toEqual(['[VAR_1]', '[VAR_2]']);
    });

    it('should not match similar but invalid token formats', () => {
      const result = service.validate('Hello [VAR_X] [VAR_] VAR_1 [VAR1]!');

      expect(result.valid).toBe(true);
      expect(result.unresolvedTokens).toEqual([]);
    });
  });

  describe('extractVariables', () => {
    it('should return empty array for empty content', () => {
      const result = service.extractVariables('');

      expect(result).toEqual([]);
    });

    it('should return empty array for content without variables', () => {
      const result = service.extractVariables('Hello World!');

      expect(result).toEqual([]);
    });

    it('should extract single variable', () => {
      const result = service.extractVariables('Hello {{name}}!');

      expect(result).toEqual(['{{name}}']);
    });

    it('should extract multiple unique variables', () => {
      const result = service.extractVariables('{{firstName}} {{lastName}}');

      expect(result).toContain('{{firstName}}');
      expect(result).toContain('{{lastName}}');
      expect(result.length).toBe(2);
    });

    it('should not duplicate variables', () => {
      const result = service.extractVariables('{{name}} {{name}} {{name}}');

      expect(result).toEqual(['{{name}}']);
    });
  });

  describe('countVariables', () => {
    it('should return zeros for empty content', () => {
      const result = service.countVariables('');

      expect(result).toEqual({ unique: 0, total: 0 });
    });

    it('should count single variable', () => {
      const result = service.countVariables('Hello {{name}}!');

      expect(result).toEqual({ unique: 1, total: 1 });
    });

    it('should count multiple different variables', () => {
      const result = service.countVariables('{{firstName}} {{lastName}}');

      expect(result).toEqual({ unique: 2, total: 2 });
    });

    it('should count duplicates correctly', () => {
      const result = service.countVariables('{{name}} said {{greeting}} to {{name}}');

      expect(result).toEqual({ unique: 2, total: 3 });
    });
  });

  describe('hasVariables', () => {
    it('should return false for empty content', () => {
      expect(service.hasVariables('')).toBe(false);
    });

    it('should return false for null content', () => {
      expect(service.hasVariables(null as unknown as string)).toBe(false);
    });

    it('should return false for content without variables', () => {
      expect(service.hasVariables('Hello World!')).toBe(false);
    });

    it('should return true for content with variables', () => {
      expect(service.hasVariables('Hello {{name}}!')).toBe(true);
    });
  });

  describe('hasTokens', () => {
    it('should return false for empty content', () => {
      expect(service.hasTokens('')).toBe(false);
    });

    it('should return false for null content', () => {
      expect(service.hasTokens(null as unknown as string)).toBe(false);
    });

    it('should return false for content without tokens', () => {
      expect(service.hasTokens('Hello World!')).toBe(false);
    });

    it('should return false for content with only variables', () => {
      expect(service.hasTokens('Hello {{name}}!')).toBe(false);
    });

    it('should return true for content with tokens', () => {
      expect(service.hasTokens('Hello [VAR_1]!')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in variable names', () => {
      const content = '{{user-name}} {{user_email}} {{user.profile.name}}';
      const result = service.tokenize(content);

      expect(result.variableMap.size).toBe(3);
      expect(service.detokenize(result.tokenized, result.variableMap)).toBe(content);
    });

    it('should handle variables at start and end', () => {
      const content = '{{greeting}}, World{{punctuation}}';
      const tokenized = service.tokenize(content);
      const restored = service.detokenize(tokenized.tokenized, tokenized.variableMap);

      expect(restored).toBe(content);
    });

    it('should handle adjacent variables', () => {
      const content = '{{first}}{{second}}{{third}}';
      const tokenized = service.tokenize(content);
      const restored = service.detokenize(tokenized.tokenized, tokenized.variableMap);

      expect(restored).toBe(content);
    });

    it('should handle very long content with many variables', () => {
      const variables = Array.from({ length: 100 }, (_, i) => `{{var${i}}}`);
      const content = variables.join(' ');
      const tokenized = service.tokenize(content);

      expect(tokenized.variableMap.size).toBe(100);
      expect(service.detokenize(tokenized.tokenized, tokenized.variableMap)).toBe(content);
    });

    it('should handle multiline content', () => {
      const content = `Line 1: {{var1}}
Line 2: {{var2}}
Line 3: {{var1}} again`;
      const tokenized = service.tokenize(content);
      const restored = service.detokenize(tokenized.tokenized, tokenized.variableMap);

      expect(restored).toBe(content);
    });

    it('should handle content with existing bracket patterns', () => {
      const content = '[Note: {{name}}] - Array: [1, 2, 3]';
      const tokenized = service.tokenize(content);
      const restored = service.detokenize(tokenized.tokenized, tokenized.variableMap);

      expect(restored).toBe(content);
    });
  });
});
