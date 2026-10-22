import { z } from "zod";

/**
 * JSONLogic skip-condition schemas for workflow steps.
 *
 * Exposed as factory functions because each call returns a fresh Zod
 * instance — reusing a shared instance across many step variants causes
 * `zod-to-json-schema` to emit deeply-nested `$defs` chains that some MCP
 * clients reject.
 */

function createSkipValueSchema() {
	return z.union([
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
}

function createSkipComparisonSchema() {
	return z.union([
		z
			.object({
				"==": z
					.array(createSkipValueSchema())
					.describe("Array of exactly 2 values to compare for equality"),
			})
			.describe("Equality comparison"),
		z
			.object({
				"!=": z
					.array(createSkipValueSchema())
					.describe("Array of exactly 2 values to compare for inequality"),
			})
			.describe("Inequality comparison"),
		z
			.object({
				">": z
					.array(createSkipValueSchema())
					.describe("Array of exactly 2 values: first > second"),
			})
			.describe("Greater than comparison"),
		z
			.object({
				">=": z
					.array(createSkipValueSchema())
					.describe("Array of exactly 2 values: first >= second"),
			})
			.describe("Greater than or equal comparison"),
		z
			.object({
				"<": z
					.array(createSkipValueSchema())
					.describe("Array of exactly 2 values: first < second"),
			})
			.describe("Less than comparison"),
		z
			.object({
				"<=": z
					.array(createSkipValueSchema())
					.describe("Array of exactly 2 values: first <= second"),
			})
			.describe("Less than or equal comparison"),
		z
			.object({
				in: z
					.array(createSkipValueSchema())
					.describe(
						"Array of exactly 2 values [value, array] - checks if first element exists in second",
					),
			})
			.describe("Check if value exists in array"),
	]);
}

export function createSkipConditionSchema() {
	return z
		.union([
			z
				.object({
					and: z
						.array(createSkipComparisonSchema())
						.min(1)
						.describe("Array of conditions (at least 1) that must ALL be true"),
				})
				.describe("Logical AND - all conditions must be true"),
			z
				.object({
					or: z
						.array(createSkipComparisonSchema())
						.min(1)
						.describe(
							"Array of conditions (at least 1) where at least ONE must be true",
						),
				})
				.describe("Logical OR - at least one condition must be true"),
			createSkipComparisonSchema(),
		])
		.optional()
		.describe(
			'JSONLogic condition for conditionally SKIPPING the workflow step. When the condition evaluates to true, the step is skipped. Use comparison operators with variable references. Examples: { "==": [{ "var": "subscriber.isOnline" }, true] } skips when subscriber is online, { "!=": [{ "var": "payload.priority" }, "high"] } skips when priority is not high.',
		);
}
