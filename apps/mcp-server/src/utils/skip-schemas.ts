import { z } from "zod";

/**
 * JSONLogic skip-condition schemas for workflow steps.
 *
 * Every step type reuses the same instances, so `get_step_schema` can
 * reference them once instead of repeating them per step type.
 */

const skipValueSchema = z.union([
	z.string().describe("String literal value"),
	z.number().describe("Numeric literal value"),
	z.boolean().describe("Boolean literal value"),
	z.null().describe("Null value"),
	z
		.object({
			var: z
				.string()
				.describe(
					'Path to the variable value. Prefixes: "payload." for trigger data, "subscriber." for subscriber data, "steps.<stepId>." for previous step output',
				),
		})
		.describe("Variable reference to access payload, subscriber, or previous step data"),
]);

const skipComparisonSchema = z.union([
	z
		.object({
			"==": z
				.array(skipValueSchema)
				.describe("Array of exactly 2 values to compare for equality"),
		})
		.describe("Equality comparison"),
	z
		.object({
			"!=": z
				.array(skipValueSchema)
				.describe("Array of exactly 2 values to compare for inequality"),
		})
		.describe("Inequality comparison"),
	z
		.object({
			">": z.array(skipValueSchema).describe("Array of exactly 2 values: first > second"),
		})
		.describe("Greater than comparison"),
	z
		.object({
			">=": z.array(skipValueSchema).describe("Array of exactly 2 values: first >= second"),
		})
		.describe("Greater than or equal comparison"),
	z
		.object({
			"<": z.array(skipValueSchema).describe("Array of exactly 2 values: first < second"),
		})
		.describe("Less than comparison"),
	z
		.object({
			"<=": z.array(skipValueSchema).describe("Array of exactly 2 values: first <= second"),
		})
		.describe("Less than or equal comparison"),
	z
		.object({
			in: z
				.array(skipValueSchema)
				.describe(
					"Array of exactly 2 values [value, array] - checks if first element exists in second",
				),
		})
		.describe("Check if value exists in array"),
]);

/** Every option of the skip union failing says only "Invalid input", which a model can't act on. */
export const SKIP_CONDITION_ERROR =
	'Invalid skip condition: expected one comparison { "<op>": [a, b] } with op ==, !=, >, >=, <, <= or in, or { "and": [comparisons] } / { "or": [comparisons] } with at least one comparison and no nesting, where each operand is a string, number, boolean, null or { "var": "payload.x" }';

export const skipConditionSchema = z.union(
	[
		z
			.object({
				and: z
					.array(skipComparisonSchema)
					.min(1)
					.describe("Array of conditions (at least 1) that must ALL be true"),
			})
			.describe("Logical AND - all conditions must be true"),
		z
			.object({
				or: z
					.array(skipComparisonSchema)
					.min(1)
					.describe("Array of conditions (at least 1) where at least ONE must be true"),
			})
			.describe("Logical OR - at least one condition must be true"),
		skipComparisonSchema,
	],
	{ error: (issue) => (issue.code === "invalid_union" ? SKIP_CONDITION_ERROR : undefined) },
);

export const SKIP_CONDITION_DESCRIPTION =
	'JSONLogic condition for conditionally RUNNING the workflow step: the step runs when the condition evaluates to true and is skipped otherwise, and a step without a condition always runs. Use comparison operators with variable references. Examples: { "==": [{ "var": "subscriber.isOnline" }, false] } runs the step only when the subscriber is offline, { "!=": [{ "var": "payload.priority" }, "high"] } runs it only when the priority is not high.';

/** The optional `skip` control value every step type takes. */
export const optionalSkipConditionSchema = skipConditionSchema
	.optional()
	.describe(SKIP_CONDITION_DESCRIPTION);
