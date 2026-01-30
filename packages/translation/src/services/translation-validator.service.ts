import { Injectable } from "@nestjs/common";

import {
	type ValidateRequest,
	type ValidationError,
	ValidationErrorType,
	type ValidationResult,
	ValidationSeverity,
} from "../types/translation.types";

/**
 * Regex patterns for HTML validation
 */
const HTML_PATTERNS = {
	/**
	 * Matches opening HTML tags: <tagname attributes>
	 */
	OPENING_TAG: /<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*(?<!\/)>/g,

	/**
	 * Matches closing HTML tags: </tagname>
	 */
	CLOSING_TAG: /<\/([a-zA-Z][a-zA-Z0-9]*)>/g,

	/**
	 * Matches self-closing tags: <tagname /> or void elements
	 */
	SELF_CLOSING_TAG: /<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/>/g,

	/**
	 * Matches broken tags (missing closing bracket)
	 */
	BROKEN_TAG: /<[a-zA-Z][^>]*(?:$|(?=<))/g,

	/**
	 * Matches our placeholder tokens: [VAR_1], [VAR_23], etc.
	 */
	TOKEN: /\[VAR_\d+\]/g,
};

/**
 * HTML void elements that don't have closing tags
 */
const VOID_ELEMENTS = new Set([
	"area",
	"base",
	"br",
	"col",
	"embed",
	"hr",
	"img",
	"input",
	"link",
	"meta",
	"param",
	"source",
	"track",
	"wbr",
]);

/**
 * Content length thresholds
 */
const CONTENT_LENGTH_CONFIG = {
	/**
	 * Warn if translated content is less than this ratio of original
	 */
	MIN_LENGTH_RATIO: 0.3,

	/**
	 * Warn if translated content is more than this ratio of original
	 */
	MAX_LENGTH_RATIO: 3.0,

	/**
	 * Minimum content length to apply ratio checks
	 */
	MIN_CONTENT_LENGTH: 10,
};

/**
 * Tag balance tolerance - some HTML emails may have slight imbalances
 */
const TAG_BALANCE_TOLERANCE = 2;

/**
 * TranslationValidatorService
 *
 * Validates translated content to ensure:
 * 1. All variable tokens were properly restored
 * 2. HTML structure is maintained (tag balance)
 * 3. No broken or malformed HTML tags
 * 4. Content length is reasonable (not truncated or overly expanded)
 *
 * This validation layer catches common LLM translation issues:
 * - Missing or modified variable tokens
 * - Broken HTML that would cause rendering issues
 * - Content that was truncated or incorrectly expanded
 *
 * @example
 * ```typescript
 * const validator = new TranslationValidatorService();
 *
 * const result = validator.validate({
 *   original: '<div>Hello {{name}}!</div>',
 *   translated: '<div>Hola {{name}}!</div>',
 * });
 *
 * if (!result.valid) {
 *   console.log('Validation errors:', result.errors);
 * }
 * ```
 */
@Injectable()
export class TranslationValidatorService {
	/**
	 * Validate translated content against the original
	 *
	 * Performs multiple validation checks:
	 * 1. Token validation - ensures all variable tokens were restored
	 * 2. HTML tag balance - checks opening/closing tag counts
	 * 3. Broken tag detection - finds malformed HTML
	 * 4. Content length check - warns about potential truncation/expansion
	 *
	 * @param request - Validation request with original and translated content
	 * @returns Validation result with errors and statistics
	 */
	validate(request: ValidateRequest): ValidationResult {
		const { original, translated, variableMap } = request;
		const errors: ValidationError[] = [];

		// Handle edge cases
		if (!translated) {
			errors.push({
				type: ValidationErrorType.MISSING_CONTENT,
				severity: ValidationSeverity.ERROR,
				message: "Translated content is empty or missing",
			});

			return { valid: false, errors };
		}

		// 1. Check for unresolved tokens
		this.validateTokens(translated, variableMap, errors);

		// 2. Check HTML tag balance
		const originalTagStats = this.analyzeHtmlTags(original || "");
		const translatedTagStats = this.analyzeHtmlTags(translated);
		this.validateTagBalance(originalTagStats, translatedTagStats, errors);

		// 3. Check for broken tags
		this.validateBrokenTags(translated, errors);

		// 4. Check content length
		if (original) {
			this.validateContentLength(original, translated, errors);
		}

		// Determine overall validity (warnings don't affect validity)
		const hasErrors = errors.some(
			(e) => e.severity === ValidationSeverity.ERROR,
		);

		return {
			valid: !hasErrors,
			errors,
			stats: {
				originalLength: original?.length || 0,
				translatedLength: translated.length,
				lengthRatio: original ? translated.length / original.length : 1,
				tagBalance: translatedTagStats,
			},
		};
	}

	/**
	 * Validate that all tokens were resolved
	 *
	 * @param content - Content to check
	 * @param variableMap - Expected variable map
	 * @param errors - Array to append errors to
	 */
	private validateTokens(
		content: string,
		variableMap: Map<string, string> | undefined,
		errors: ValidationError[],
	): void {
		const unresolvedTokens: string[] = [];
		let match: RegExpExecArray | null;
		const regex = new RegExp(HTML_PATTERNS.TOKEN.source, "g");

		while ((match = regex.exec(content)) !== null) {
			unresolvedTokens.push(match[0]);
		}

		const uniqueUnresolved = [...new Set(unresolvedTokens)];

		if (uniqueUnresolved.length > 0) {
			errors.push({
				type: ValidationErrorType.UNRESOLVED_TOKEN,
				severity: ValidationSeverity.ERROR,
				message: `Found ${uniqueUnresolved.length} unresolved token(s): ${uniqueUnresolved.join(", ")}`,
				context: uniqueUnresolved.join(", "),
			});
		}

		// Check if any expected tokens are missing
		if (variableMap && variableMap.size > 0) {
			const contentTokens = new Set(unresolvedTokens);
			const expectedTokens = Array.from(variableMap.keys());
			const missingTokens = expectedTokens.filter(
				(token) => !content.includes(token) && !contentTokens.has(token),
			);

			if (missingTokens.length > 0) {
				// Check if the actual variables are present (they should be after detokenization)
				const missingVariables = missingTokens
					.map((token) => variableMap.get(token))
					.filter((variable) => variable && !content.includes(variable));

				if (missingVariables.length > 0) {
					errors.push({
						type: ValidationErrorType.UNRESOLVED_TOKEN,
						severity: ValidationSeverity.WARNING,
						message: `Possible missing variables: ${missingVariables.join(", ")}`,
						context: missingVariables.join(", "),
					});
				}
			}
		}
	}

	/**
	 * Analyze HTML tags in content
	 *
	 * @param content - Content to analyze
	 * @returns Tag statistics
	 */
	private analyzeHtmlTags(content: string): {
		openingTags: number;
		closingTags: number;
		selfClosingTags: number;
	} {
		const openingMatches = content.match(HTML_PATTERNS.OPENING_TAG) || [];
		const closingMatches = content.match(HTML_PATTERNS.CLOSING_TAG) || [];
		const selfClosingMatches =
			content.match(HTML_PATTERNS.SELF_CLOSING_TAG) || [];

		// Filter out void elements from opening tags count
		const nonVoidOpeningTags = openingMatches.filter((tag) => {
			const tagName = tag.match(/<([a-zA-Z][a-zA-Z0-9]*)/)?.[1]?.toLowerCase();

			return tagName && !VOID_ELEMENTS.has(tagName);
		});

		return {
			openingTags: nonVoidOpeningTags.length,
			closingTags: closingMatches.length,
			selfClosingTags: selfClosingMatches.length,
		};
	}

	/**
	 * Validate HTML tag balance between original and translated content
	 *
	 * @param original - Original tag statistics
	 * @param translated - Translated tag statistics
	 * @param errors - Array to append errors to
	 */
	private validateTagBalance(
		original: {
			openingTags: number;
			closingTags: number;
			selfClosingTags: number;
		},
		translated: {
			openingTags: number;
			closingTags: number;
			selfClosingTags: number;
		},
		errors: ValidationError[],
	): void {
		// Check internal balance of translated content
		const internalImbalance = Math.abs(
			translated.openingTags - translated.closingTags,
		);

		if (internalImbalance > TAG_BALANCE_TOLERANCE) {
			errors.push({
				type: ValidationErrorType.HTML_TAG_IMBALANCE,
				severity: ValidationSeverity.ERROR,
				message: `HTML tag imbalance: ${translated.openingTags} opening tags, ${translated.closingTags} closing tags (difference: ${internalImbalance})`,
				context: `opening: ${translated.openingTags}, closing: ${translated.closingTags}`,
			});

			return;
		}

		// Check if translated content has significantly different tag counts from original
		const openingDiff = Math.abs(translated.openingTags - original.openingTags);
		const closingDiff = Math.abs(translated.closingTags - original.closingTags);

		if (
			openingDiff > TAG_BALANCE_TOLERANCE ||
			closingDiff > TAG_BALANCE_TOLERANCE
		) {
			errors.push({
				type: ValidationErrorType.HTML_TAG_IMBALANCE,
				severity: ValidationSeverity.WARNING,
				message: `Tag count differs from original: original had ${original.openingTags}/${original.closingTags} tags, translated has ${translated.openingTags}/${translated.closingTags}`,
				context: `original: ${original.openingTags}/${original.closingTags}, translated: ${translated.openingTags}/${translated.closingTags}`,
			});
		}
	}

	/**
	 * Check for broken/malformed HTML tags
	 *
	 * @param content - Content to check
	 * @param errors - Array to append errors to
	 */
	private validateBrokenTags(content: string, errors: ValidationError[]): void {
		// Look for tags that start but don't close properly
		const brokenTagMatches = content.match(HTML_PATTERNS.BROKEN_TAG) || [];

		// Filter out false positives (e.g., < in text, CDATA sections)
		const reallyBrokenTags = brokenTagMatches.filter((tag) => {
			// Must start with < followed by a letter
			if (!/^<[a-zA-Z]/.test(tag)) {
				return false;
			}
			// If it ends with > or />, it's not broken
			if (tag.endsWith(">")) {
				return false;
			}

			return true;
		});

		if (reallyBrokenTags.length > 0) {
			errors.push({
				type: ValidationErrorType.BROKEN_TAG,
				severity: ValidationSeverity.ERROR,
				message: `Found ${reallyBrokenTags.length} broken HTML tag(s) (missing closing bracket)`,
				context:
					reallyBrokenTags.slice(0, 3).join(", ") +
					(reallyBrokenTags.length > 3 ? "..." : ""),
			});
		}

		// Also check for common malformed patterns
		this.checkMalformedPatterns(content, errors);
	}

	/**
	 * Check for common malformed HTML patterns
	 *
	 * @param content - Content to check
	 * @param errors - Array to append errors to
	 */
	private checkMalformedPatterns(
		content: string,
		errors: ValidationError[],
	): void {
		// Check for double opening brackets
		if (content.includes("<<")) {
			const count = (content.match(/<</g) || []).length;
			errors.push({
				type: ValidationErrorType.BROKEN_TAG,
				severity: ValidationSeverity.WARNING,
				message: `Found ${count} instance(s) of double opening brackets (<<)`,
				context: "<<",
			});
		}

		// Check for unclosed attribute quotes within tags
		const tagsWithUnclosedQuotes = content.match(/<[^>]*="[^"]*[^>]*>/g) || [];
		const malformedAttrTags = tagsWithUnclosedQuotes.filter((tag) => {
			const doubleQuotes = (tag.match(/"/g) || []).length;
			const singleQuotes = (tag.match(/'/g) || []).length;

			// Odd number of quotes suggests unclosed
			return doubleQuotes % 2 !== 0 || singleQuotes % 2 !== 0;
		});

		if (malformedAttrTags.length > 0) {
			errors.push({
				type: ValidationErrorType.BROKEN_TAG,
				severity: ValidationSeverity.WARNING,
				message: `Found ${malformedAttrTags.length} tag(s) with potentially unclosed attribute quotes`,
				context:
					malformedAttrTags[0].substring(0, 50) +
					(malformedAttrTags[0].length > 50 ? "..." : ""),
			});
		}
	}

	/**
	 * Validate content length is reasonable
	 *
	 * @param original - Original content
	 * @param translated - Translated content
	 * @param errors - Array to append errors to
	 */
	private validateContentLength(
		original: string,
		translated: string,
		errors: ValidationError[],
	): void {
		// Skip check for very short content
		if (original.length < CONTENT_LENGTH_CONFIG.MIN_CONTENT_LENGTH) {
			return;
		}

		const ratio = translated.length / original.length;

		if (ratio < CONTENT_LENGTH_CONFIG.MIN_LENGTH_RATIO) {
			errors.push({
				type: ValidationErrorType.CONTENT_LENGTH_ANOMALY,
				severity: ValidationSeverity.WARNING,
				message: `Translated content is ${Math.round(ratio * 100)}% of original length (minimum expected: ${CONTENT_LENGTH_CONFIG.MIN_LENGTH_RATIO * 100}%)`,
				context: `original: ${original.length} chars, translated: ${translated.length} chars`,
			});
		} else if (ratio > CONTENT_LENGTH_CONFIG.MAX_LENGTH_RATIO) {
			errors.push({
				type: ValidationErrorType.CONTENT_LENGTH_ANOMALY,
				severity: ValidationSeverity.WARNING,
				message: `Translated content is ${Math.round(ratio * 100)}% of original length (maximum expected: ${CONTENT_LENGTH_CONFIG.MAX_LENGTH_RATIO * 100}%)`,
				context: `original: ${original.length} chars, translated: ${translated.length} chars`,
			});
		}
	}

	/**
	 * Quick check if content is likely valid HTML
	 *
	 * This is a lightweight check for common issues, not a full HTML parser.
	 *
	 * @param content - Content to check
	 * @returns Whether content appears to be valid HTML
	 */
	isLikelyValidHtml(content: string): boolean {
		if (!content) {
			return true;
		}

		// Check for broken tags
		const brokenTags = content.match(HTML_PATTERNS.BROKEN_TAG) || [];
		if (brokenTags.some((tag) => !tag.endsWith(">"))) {
			return false;
		}

		// Check tag balance
		const stats = this.analyzeHtmlTags(content);
		const imbalance = Math.abs(stats.openingTags - stats.closingTags);

		return imbalance <= TAG_BALANCE_TOLERANCE;
	}

	/**
	 * Get a summary of validation issues
	 *
	 * @param result - Validation result
	 * @returns Human-readable summary
	 */
	getSummary(result: ValidationResult): string {
		if (result.valid && result.errors.length === 0) {
			return "Content validation passed with no issues.";
		}

		const errorCount = result.errors.filter(
			(e) => e.severity === ValidationSeverity.ERROR,
		).length;
		const warningCount = result.errors.filter(
			(e) => e.severity === ValidationSeverity.WARNING,
		).length;

		const parts: string[] = [];
		if (errorCount > 0) {
			parts.push(`${errorCount} error(s)`);
		}
		if (warningCount > 0) {
			parts.push(`${warningCount} warning(s)`);
		}

		return `Content validation ${result.valid ? "passed" : "failed"} with ${parts.join(" and ")}.`;
	}
}
