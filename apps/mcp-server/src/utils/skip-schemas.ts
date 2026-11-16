import { z } from "zod";

/**
 * JSONLogic skip-condition schemas for workflow steps.
 *
 * The titles name these schemas in the definitions `get_step_schema` returns.
 */

const skipValueSchema = z
	.union([
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
	])
	.meta({ title: "skipOperand" });

const skipComparisonSchema = z
	.union([
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
				">=": z
					.array(skipValueSchema)
					.describe("Array of exactly 2 values: first >= second"),
			})
			.describe("Greater than or equal comparison"),
		z
			.object({
				"<": z.array(skipValueSchema).describe("Array of exactly 2 values: first < second"),
			})
			.describe("Less than comparison"),
		z
			.object({
				"<=": z
					.array(skipValueSchema)
					.describe("Array of exactly 2 values: first <= second"),
			})
			.describe("Less than or equal comparison"),
		z
			.object({
				in: z
					.array(skipValueSchema)
					.describe(
						'Array of exactly 2 values [value, list]: true when value is in list, a string or a { "var" } reference to an array, never an array literal',
					),
			})
			.describe("Check if value exists in a list"),
	])
	.meta({ title: "skipComparison" });

/** Every option of the skip union failing says only "Invalid input", which a model can't act on. */
const SKIP_CONDITION_ERROR =
	'Invalid skip condition: expected one comparison { "<op>": [a, b] } with op ==, !=, >, >=, <, <= or in, or { "and": [comparisons] } / { "or": [comparisons] } with at least one comparison and no nesting, where each operand is a string, number, boolean, null or { "var": "payload.x" } (for a fixed list, use an "or" of "==" comparisons; for no condition, pass null or leave skip out)';

const skipConditionSchema = z
	.union(
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
						.describe(
							"Array of conditions (at least 1) where at least ONE must be true",
						),
				})
				.describe("Logical OR - at least one condition must be true"),
			skipComparisonSchema,
		],
		{ error: (issue) => (issue.code === "invalid_union" ? SKIP_CONDITION_ERROR : undefined) },
	)
	.meta({ title: "skipCondition" });

const SKIP_CONDITION_DESCRIPTION =
	'JSONLogic condition for conditionally RUNNING the workflow step: the step runs when the condition evaluates to true and is skipped otherwise, and a step without a condition always runs. Use comparison operators with variable references. Examples: { "==": [{ "var": "subscriber.isOnline" }, false] } runs the step only when the subscriber is offline, { "!=": [{ "var": "payload.priority" }, "high"] } runs it only when the priority is not high.';

/** The `skip` control value every step type takes; the dashboard saves a cleared one as null. */
export const optionalSkipConditionSchema = skipConditionSchema
	.nullish()
	.describe(SKIP_CONDITION_DESCRIPTION)
	.meta({ title: "skip" });

const SKIP_CONDITION_GUIDE =
	'JSONLogic run condition: the step runs only when it is true. Use one comparison { "<op>": [a, b] } with op ==, !=, >, >=, <, <= or in (one operator per object), or { "and": [comparisons] } / { "or": [comparisons] } with at least one comparison (groups do not nest). Each operand is a string, number, boolean, null or { "var": "<path>" } with a path such as "payload.tier", "subscriber.isOnline" or "steps.<stepId>.<field>" (an in_app step\'s seen or read, a digest step\'s eventCount), never an array literal: "in" checks the first operand against a string or an array variable, e.g. { "in": ["gold", { "var": "payload.tiers" }] }; for a fixed list, use an "or" of "==" comparisons. Example: { "==": [{ "var": "subscriber.isOnline" }, false] } runs the step only for offline subscribers.';

/** The advertised `skip` of update_workflow_step_conditions: any object, parsed by the skip union. */
export const skipConditionInputSchema = z
	.record(z.string(), z.unknown(), { error: SKIP_CONDITION_ERROR })
	.pipe(skipConditionSchema)
	.nullish()
	.describe(SKIP_CONDITION_GUIDE);
