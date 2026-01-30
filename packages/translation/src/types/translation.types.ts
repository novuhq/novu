/**
 * Translation Types
 *
 * Shared TypeScript interfaces and types for the translation services.
 * These types define the contracts for tokenization, validation, and translation operations.
 */

// ============================================================================
// Variable Tokenizer Types
// ============================================================================

/**
 * Result of tokenizing variables in content
 */
export interface TokenizeResult {
	/**
	 * Content with variables replaced by tokens
	 * e.g., "Hello {{name}}" → "Hello [VAR_1]"
	 */
	tokenized: string;

	/**
	 * Map of tokens to original variables
	 * e.g., Map { "[VAR_1]" → "{{name}}" }
	 */
	variableMap: Map<string, string>;

	/**
	 * List of original variable expressions found
	 */
	variables: string[];
}

/**
 * Result of validating tokenization
 */
export interface TokenValidationResult {
	/**
	 * Whether all tokens were properly resolved
	 */
	valid: boolean;

	/**
	 * List of unresolved tokens still in content
	 * e.g., ["[VAR_3]", "[VAR_5]"]
	 */
	unresolvedTokens: string[];
}

// ============================================================================
// Translation Validator Types
// ============================================================================

/**
 * Severity level for validation errors
 */
export enum ValidationSeverity {
	ERROR = "error",
	WARNING = "warning",
	INFO = "info",
}

/**
 * Types of validation errors
 */
export enum ValidationErrorType {
	UNRESOLVED_TOKEN = "UNRESOLVED_TOKEN",
	HTML_TAG_IMBALANCE = "HTML_TAG_IMBALANCE",
	BROKEN_TAG = "BROKEN_TAG",
	CONTENT_LENGTH_ANOMALY = "CONTENT_LENGTH_ANOMALY",
	MISSING_CONTENT = "MISSING_CONTENT",
}

/**
 * A validation error or warning
 */
export interface ValidationError {
	/**
	 * Type of validation issue
	 */
	type: ValidationErrorType;

	/**
	 * Severity level
	 */
	severity: ValidationSeverity;

	/**
	 * Human-readable error message
	 */
	message: string;

	/**
	 * Additional context (e.g., the problematic tag or token)
	 */
	context?: string;
}

/**
 * Request to validate translated content
 */
export interface ValidateRequest {
	/**
	 * Original content before translation
	 */
	original: string;

	/**
	 * Translated content to validate
	 */
	translated: string;

	/**
	 * Variable map for token validation
	 */
	variableMap?: Map<string, string>;
}

/**
 * Result of content validation
 */
export interface ValidationResult {
	/**
	 * Whether the content passed all validation checks
	 * Note: Warnings don't affect this flag, only errors do
	 */
	valid: boolean;

	/**
	 * List of validation errors and warnings
	 */
	errors: ValidationError[];

	/**
	 * Summary statistics
	 */
	stats?: {
		originalLength: number;
		translatedLength: number;
		lengthRatio: number;
		tagBalance: {
			openingTags: number;
			closingTags: number;
			selfClosingTags: number;
		};
	};
}

// ============================================================================
// Translation Service Types
// ============================================================================

/**
 * Request to translate content
 */
export interface TranslateRequest {
	/**
	 * Organization ID for settings lookup
	 */
	organizationId: string;

	/**
	 * Content to translate (may include HTML and variables)
	 */
	content: string;

	/**
	 * Source locale (BCP-47 tag, e.g., "en_US")
	 */
	sourceLocale: string;

	/**
	 * Target locale (BCP-47 tag, e.g., "es_ES")
	 */
	targetLocale: string;

	/**
	 * Optional: Content type hint for better translation
	 */
	contentType?: "email" | "sms" | "push" | "in-app" | "chat";

	/**
	 * Optional: Skip validation step
	 */
	skipValidation?: boolean;

	/**
	 * Optional: Custom instructions for translation
	 */
	customInstructions?: string;
}

/**
 * Response from translation
 */
export interface TranslateResponse {
	/**
	 * Whether translation was successful
	 */
	success: boolean;

	/**
	 * Translated content
	 */
	translated?: string;

	/**
	 * Error message if translation failed
	 */
	error?: string;

	/**
	 * Validation result
	 */
	validation?: ValidationResult;

	/**
	 * Metadata about the translation
	 */
	metadata?: {
		model: string;
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
		latencyMs: number;
	};
}

/**
 * Request for batch translation
 */
export interface BatchTranslateRequest {
	/**
	 * Organization ID for settings lookup
	 */
	organizationId: string;

	/**
	 * Array of content items to translate
	 */
	items: Array<{
		/**
		 * Unique identifier for this content item
		 */
		id: string;

		/**
		 * Content to translate
		 */
		content: string;

		/**
		 * Optional: Content type hint
		 */
		contentType?: "email" | "sms" | "push" | "in-app" | "chat";
	}>;

	/**
	 * Source locale for all items
	 */
	sourceLocale: string;

	/**
	 * Target locale for all items
	 */
	targetLocale: string;

	/**
	 * Optional: Skip validation
	 */
	skipValidation?: boolean;
}

/**
 * Response from batch translation
 */
export interface BatchTranslateResponse {
	/**
	 * Overall success status
	 */
	success: boolean;

	/**
	 * Results for each content item
	 */
	results: Array<{
		/**
		 * ID matching the input item
		 */
		id: string;

		/**
		 * Whether this item was translated successfully
		 */
		success: boolean;

		/**
		 * Translated content
		 */
		translated?: string;

		/**
		 * Error message if this item failed
		 */
		error?: string;

		/**
		 * Validation result
		 */
		validation?: ValidationResult;
	}>;

	/**
	 * Total processing metadata
	 */
	metadata?: {
		totalItems: number;
		successfulItems: number;
		failedItems: number;
		totalTokens: number;
		totalLatencyMs: number;
	};
}

/**
 * Result of testing API connection
 */
export interface ConnectionTestResult {
	/**
	 * Whether the connection test succeeded
	 */
	success: boolean;

	/**
	 * Error message if test failed
	 */
	error?: string;

	/**
	 * Model used for test
	 */
	model?: string;

	/**
	 * Latency of test call in milliseconds
	 */
	latencyMs?: number;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Base class for translation errors
 */
export class TranslationError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly retryable: boolean = false,
	) {
		super(message);
		this.name = "TranslationError";
	}
}

/**
 * Error when API key is not configured
 */
export class ApiKeyNotConfiguredError extends TranslationError {
	constructor(organizationId: string) {
		super(
			`OpenAI API key not configured for organization ${organizationId}`,
			"API_KEY_NOT_CONFIGURED",
			false,
		);
		this.name = "ApiKeyNotConfiguredError";
	}
}

/**
 * Error when API rate limit is exceeded
 */
export class RateLimitError extends TranslationError {
	constructor(public readonly retryAfterMs?: number) {
		super("OpenAI API rate limit exceeded", "RATE_LIMIT_EXCEEDED", true);
		this.name = "RateLimitError";
	}
}

/**
 * Error when API returns invalid response
 */
export class InvalidResponseError extends TranslationError {
	constructor(message: string) {
		super(
			`Invalid response from OpenAI API: ${message}`,
			"INVALID_RESPONSE",
			true,
		);
		this.name = "InvalidResponseError";
	}
}

/**
 * Error when validation fails
 */
export class ValidationFailedError extends TranslationError {
	constructor(public readonly validationResult: ValidationResult) {
		super(
			`Translation validation failed: ${validationResult.errors.map((e) => e.message).join(", ")}`,
			"VALIDATION_FAILED",
			false,
		);
		this.name = "ValidationFailedError";
	}
}
