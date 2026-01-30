import { Injectable } from '@nestjs/common';

import {
  TokenizeResult,
  TokenValidationResult,
} from '../types/translation.types';

/**
 * Token prefix used for variable placeholders
 * Using square brackets to avoid conflicts with HTML, Handlebars, and most content
 */
const TOKEN_PREFIX = '[VAR_';
const TOKEN_SUFFIX = ']';

/**
 * Regex patterns for variable detection and token matching
 */
const VARIABLE_PATTERNS = {
  /**
   * Matches Handlebars/Mustache variables: {{variable}}, {{nested.variable}}, {{#each items}}
   * Also matches with helpers: {{formatDate date}}, {{#if condition}}
   */
  HANDLEBARS: /\{\{[^}]+\}\}/g,

  /**
   * Matches our placeholder tokens: [VAR_1], [VAR_23], etc.
   */
  TOKEN: /\[VAR_\d+\]/g,
};

/**
 * VariableTokenizerService
 *
 * Replaces template variables (e.g., {{name}}, {{user.email}}) with safe placeholder tokens
 * ([VAR_1], [VAR_2], etc.) before sending content to the translation API.
 *
 * This approach ensures:
 * 1. Variables are not accidentally translated
 * 2. Variable syntax is preserved exactly
 * 3. Translation validation can verify all tokens were restored
 *
 * @example
 * ```typescript
 * const tokenizer = new VariableTokenizerService();
 *
 * // Tokenize before translation
 * const { tokenized, variableMap } = tokenizer.tokenize('Hello {{name}}!');
 * // tokenized: "Hello [VAR_1]!"
 * // variableMap: Map { "[VAR_1]" → "{{name}}" }
 *
 * // After translation, detokenize
 * const translated = "Hola [VAR_1]!";
 * const result = tokenizer.detokenize(translated, variableMap);
 * // result: "Hola {{name}}!"
 * ```
 */
@Injectable()
export class VariableTokenizerService {
  /**
   * Replace all {{variable}} patterns with [VAR_X] tokens
   *
   * The tokenization is deterministic - the same content will always produce
   * the same token mapping, ordered by position in the content.
   *
   * @param content - Content containing Handlebars variables
   * @returns Tokenized content and the variable map for restoration
   */
  tokenize(content: string): TokenizeResult {
    if (!content) {
      return {
        tokenized: content,
        variableMap: new Map(),
        variables: [],
      };
    }

    const variableMap = new Map<string, string>();
    const variables: string[] = [];
    let tokenIndex = 1;

    // Find all variables and store their positions for consistent ordering
    const matches: Array<{ match: string; index: number }> = [];
    let match: RegExpExecArray | null;
    const regex = new RegExp(VARIABLE_PATTERNS.HANDLEBARS.source, 'g');

    while ((match = regex.exec(content)) !== null) {
      matches.push({ match: match[0], index: match.index });
    }

    // Sort by position to ensure consistent token numbering
    matches.sort((a, b) => a.index - b.index);

    // Build token map for unique variables only
    const variableToToken = new Map<string, string>();

    for (const { match: variable } of matches) {
      if (!variableToToken.has(variable)) {
        const token = `${TOKEN_PREFIX}${tokenIndex}${TOKEN_SUFFIX}`;
        variableToToken.set(variable, token);
        variableMap.set(token, variable);
        variables.push(variable);
        tokenIndex++;
      }
    }

    // Replace all variables with their tokens
    let tokenized = content;
    for (const [variable, token] of variableToToken) {
      // Escape special regex characters in the variable pattern
      const escapedVariable = variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      tokenized = tokenized.replace(new RegExp(escapedVariable, 'g'), token);
    }

    return {
      tokenized,
      variableMap,
      variables,
    };
  }

  /**
   * Restore [VAR_X] tokens back to original {{variable}} expressions
   *
   * @param content - Content containing [VAR_X] tokens
   * @param variableMap - Map from tokens to original variables
   * @returns Content with variables restored
   */
  detokenize(content: string, variableMap: Map<string, string>): string {
    if (!content || variableMap.size === 0) {
      return content;
    }

    let result = content;

    // Sort tokens by number to ensure consistent replacement order
    const sortedTokens = Array.from(variableMap.keys()).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10);
      const numB = parseInt(b.replace(/\D/g, ''), 10);

      return numA - numB;
    });

    for (const token of sortedTokens) {
      const variable = variableMap.get(token);
      if (variable) {
        // Escape special regex characters in the token pattern
        const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        result = result.replace(new RegExp(escapedToken, 'g'), variable);
      }
    }

    return result;
  }

  /**
   * Validate that no unresolved tokens remain in the content
   *
   * Call this after detokenization to ensure all tokens were properly restored.
   * Any remaining tokens indicate a translation issue where the LLM may have
   * modified or removed tokens.
   *
   * @param content - Content to validate
   * @returns Validation result with any unresolved tokens
   */
  validate(content: string): TokenValidationResult {
    if (!content) {
      return {
        valid: true,
        unresolvedTokens: [],
      };
    }

    const unresolvedTokens: string[] = [];
    let match: RegExpExecArray | null;
    const regex = new RegExp(VARIABLE_PATTERNS.TOKEN.source, 'g');

    while ((match = regex.exec(content)) !== null) {
      unresolvedTokens.push(match[0]);
    }

    // Remove duplicates while preserving order
    const uniqueUnresolved = [...new Set(unresolvedTokens)];

    return {
      valid: uniqueUnresolved.length === 0,
      unresolvedTokens: uniqueUnresolved,
    };
  }

  /**
   * Extract all variables from content without tokenizing
   *
   * Useful for analysis or preview purposes.
   *
   * @param content - Content to analyze
   * @returns Array of unique variable expressions found
   */
  extractVariables(content: string): string[] {
    if (!content) {
      return [];
    }

    const variables = new Set<string>();
    let match: RegExpExecArray | null;
    const regex = new RegExp(VARIABLE_PATTERNS.HANDLEBARS.source, 'g');

    while ((match = regex.exec(content)) !== null) {
      variables.add(match[0]);
    }

    return Array.from(variables);
  }

  /**
   * Count the number of variables in content
   *
   * @param content - Content to analyze
   * @returns Number of unique variables and total occurrences
   */
  countVariables(content: string): { unique: number; total: number } {
    if (!content) {
      return { unique: 0, total: 0 };
    }

    const variables = new Set<string>();
    let total = 0;
    let match: RegExpExecArray | null;
    const regex = new RegExp(VARIABLE_PATTERNS.HANDLEBARS.source, 'g');

    while ((match = regex.exec(content)) !== null) {
      variables.add(match[0]);
      total++;
    }

    return {
      unique: variables.size,
      total,
    };
  }

  /**
   * Check if content contains any variables
   *
   * @param content - Content to check
   * @returns True if content contains Handlebars variables
   */
  hasVariables(content: string): boolean {
    if (!content) {
      return false;
    }

    return VARIABLE_PATTERNS.HANDLEBARS.test(content);
  }

  /**
   * Check if content contains any tokens
   *
   * @param content - Content to check
   * @returns True if content contains [VAR_X] tokens
   */
  hasTokens(content: string): boolean {
    if (!content) {
      return false;
    }

    return VARIABLE_PATTERNS.TOKEN.test(content);
  }
}
