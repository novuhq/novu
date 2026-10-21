/** Mirrors `SLUG_IDENTIFIER_REGEX` in `@novu/shared` (workflowId and stepId). */
export const SLUG_IDENTIFIER_REGEX = /^[a-zA-Z0-9]+(?:[-_.][a-zA-Z0-9]+)*$/;

/**
 * Returns `value` unchanged when the API accepts it as a slug identifier,
 * otherwise a lowercase, dash-separated slug. Empty results fall back to
 * `fallback`.
 */
export function toSlugIdentifier(value: string, fallback = "step"): string {
	if (SLUG_IDENTIFIER_REGEX.test(value)) return value;

	const slug = value
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

	return slug || fallback;
}
