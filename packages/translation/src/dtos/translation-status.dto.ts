import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Possible statuses for a translation job
 */
export enum TranslationJobStatus {
	PENDING = "pending",
	IN_PROGRESS = "in_progress",
	COMPLETED = "completed",
	FAILED = "failed",
	PARTIALLY_COMPLETED = "partially_completed",
}

/**
 * Progress for a single locale in the job
 */
export class LocaleProgressDto {
	@ApiProperty({
		description: "Locale code",
		example: "es_ES",
	})
	locale: string;

	@ApiProperty({
		description: "Status of this locale translation",
		enum: TranslationJobStatus,
		example: TranslationJobStatus.COMPLETED,
	})
	status: TranslationJobStatus;

	@ApiPropertyOptional({
		description: "Number of content items translated",
		example: 5,
	})
	completedItems?: number;

	@ApiPropertyOptional({
		description: "Total number of content items",
		example: 10,
	})
	totalItems?: number;

	@ApiPropertyOptional({
		description: "Error message if failed",
		example: "Rate limit exceeded",
	})
	error?: string;
}

/**
 * Response DTO for translation job status
 *
 * Used for async translation jobs (Phase 7).
 * Allows clients to poll for job completion.
 *
 * @example In Progress Response
 * ```json
 * {
 *   "jobId": "job_507f1f77bcf86cd799439011",
 *   "status": "in_progress",
 *   "progress": {
 *     "completed": 1,
 *     "total": 3,
 *     "percentage": 33
 *   },
 *   "locales": [
 *     { "locale": "es_ES", "status": "completed", "completedItems": 5, "totalItems": 5 },
 *     { "locale": "fr_FR", "status": "in_progress", "completedItems": 2, "totalItems": 5 },
 *     { "locale": "de_DE", "status": "pending", "completedItems": 0, "totalItems": 5 }
 *   ],
 *   "createdAt": "2024-01-15T10:30:00.000Z",
 *   "updatedAt": "2024-01-15T10:30:15.000Z"
 * }
 * ```
 *
 * @example Completed Response
 * ```json
 * {
 *   "jobId": "job_507f1f77bcf86cd799439011",
 *   "status": "completed",
 *   "progress": {
 *     "completed": 3,
 *     "total": 3,
 *     "percentage": 100
 *   },
 *   "locales": [...],
 *   "result": { ... },
 *   "completedAt": "2024-01-15T10:31:00.000Z"
 * }
 * ```
 */
export class TranslationStatusDto {
	/**
	 * Unique job identifier
	 */
	@ApiProperty({
		description: "Unique job identifier",
		example: "job_507f1f77bcf86cd799439011",
	})
	jobId: string;

	/**
	 * Current job status
	 */
	@ApiProperty({
		description: "Current job status",
		enum: TranslationJobStatus,
		example: TranslationJobStatus.IN_PROGRESS,
	})
	status: TranslationJobStatus;

	/**
	 * Overall progress
	 */
	@ApiProperty({
		description: "Overall progress",
		example: { completed: 1, total: 3, percentage: 33 },
	})
	progress: {
		completed: number;
		total: number;
		percentage: number;
	};

	/**
	 * Progress for each locale
	 */
	@ApiProperty({
		description: "Progress for each locale",
		type: [LocaleProgressDto],
	})
	locales: LocaleProgressDto[];

	/**
	 * Resource being translated
	 */
	@ApiPropertyOptional({
		description: "Resource identifier being translated",
		example: "welcome-email-workflow",
	})
	resourceId?: string;

	/**
	 * Resource type being translated
	 */
	@ApiPropertyOptional({
		description: "Resource type being translated",
		example: "workflow",
	})
	resourceType?: string;

	/**
	 * Final result when completed (same as AutoTranslateResponseDto)
	 */
	@ApiPropertyOptional({
		description: "Final translation result (when completed)",
	})
	result?: Record<string, unknown>;

	/**
	 * Error message if job failed
	 */
	@ApiPropertyOptional({
		description: "Error message if job failed",
		example: "OpenAI API key is invalid",
	})
	error?: string;

	/**
	 * Job creation timestamp
	 */
	@ApiProperty({
		description: "When the job was created",
		example: "2024-01-15T10:30:00.000Z",
	})
	createdAt: string;

	/**
	 * Last update timestamp
	 */
	@ApiProperty({
		description: "When the job was last updated",
		example: "2024-01-15T10:30:15.000Z",
	})
	updatedAt: string;

	/**
	 * Completion timestamp (if completed)
	 */
	@ApiPropertyOptional({
		description: "When the job was completed",
		example: "2024-01-15T10:31:00.000Z",
	})
	completedAt?: string;
}
