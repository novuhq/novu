/**
 * Maily TipTap JSON Schema for AI Generation.
 *
 * Factory functions return fresh Zod instances on each call so that
 * `zod-to-json-schema` does not hoist nested schemas into shared `$defs`
 * (some MCP clients reject deeply nested or duplicated `$ref` chains).
 *
 * Keep in sync with the Novu Maily renderer node/mark properties.
 */
import { z } from "zod";

function createMailyMarkSchema() {
	return z.object({
		type: z.enum(["bold", "italic", "underline", "strike", "code"]),
	});
}

function createMailyTextStyleMarkSchema() {
	return z.object({
		attrs: z.object({
			color: z.string().nullable().describe("Text color in hex format"),
		}),
		type: z.enum(["textStyle"]),
	});
}

function createMailyLinkMarkSchema() {
	return z.object({
		attrs: z.object({
			aliasFor: z
				.string()
				.nullable()
				.describe(
					"Alias for the variable name like payload.items.variableName. Required only when variable is used inside the repeat node.",
				),
			href: z
				.string()
				.describe(
					'Link URL. When isUrlVariable is true, must be a bare variable name without curly braces, e.g. "payload.link" — never "{{ payload.link }}"',
				),
			isUrlVariable: z
				.boolean()
				.nullable()
				.describe(
					'Set true when "href" is a variable reference. The "href" value must then be a bare variable name without {{ }}',
				),
			rel: z.string().nullable(),
			target: z.enum(["_blank", "_self"]).nullable(),
		}),
		type: z.enum(["link"]),
	});
}

function createMailyTextNodeSchema({ plainText = false } = {}) {
	if (plainText) {
		return z.object({
			text: z.string(),
			type: z.enum(["text"]),
		});
	}

	return z.object({
		marks: z
			.array(
				z.discriminatedUnion("type", [
					createMailyMarkSchema(),
					createMailyTextStyleMarkSchema(),
					createMailyLinkMarkSchema(),
				]),
			)
			.nullable(),
		text: z.string(),
		type: z.enum(["text"]),
	});
}

function createMailyVariableNodeSchema() {
	return z.object({
		attrs: z.object({
			aliasFor: z
				.string()
				.nullable()
				.describe(
					"Alias for the variable name like payload.items.variableName. Required only when variable is used inside the repeat node.",
				),
			fallback: z.string().nullable(),
			id: z
				.string()
				.describe("Variable name like subscriber.firstName or payload.companyName"),
			label: z.string().nullable(),
			required: z.boolean().nullable(),
		}),
		type: z.enum(["variable"]),
	});
}

function createMailyHardBreakSchema() {
	return z.object({
		type: z.enum(["hardBreak"]),
	});
}

function createMailyButtonSchema() {
	return z.object({
		attrs: z.object({
			aliasFor: z
				.string()
				.nullable()
				.describe(
					"Alias for the variable name like payload.items.variableName. Required only when variable is used inside the repeat node.",
				),
			alignment: z.enum(["left", "center", "right"]).nullable(),
			borderRadius: z.enum(["smooth", "sharp", "round"]).nullable(),
			buttonColor: z.string().nullable().describe("Hex color like #000000"),
			isTextVariable: z
				.boolean()
				.nullable()
				.describe(
					'Set true when "text" is a variable reference. The "text" value must then be a bare variable name without {{ }}',
				),
			isUrlVariable: z
				.boolean()
				.nullable()
				.describe(
					'Set true when "url" is a variable reference. The "url" value must then be a bare variable name without {{ }}',
				),
			paddingBottom: z.number().nullable(),
			paddingLeft: z.number().nullable(),
			paddingRight: z.number().nullable(),
			paddingTop: z.number().nullable(),
			showIfKey: z.string().nullable(),
			text: z
				.string()
				.describe(
					'Button label text. When isTextVariable is true, must be a bare variable name without curly braces, e.g. "payload.actionUrl"',
				),
			textColor: z.string().nullable().describe("Hex color like #ffffff"),
			url: z
				.string()
				.nullable()
				.describe(
					'Button link URL. When isUrlVariable is true, must be a bare variable name without curly braces, e.g. "payload.actionUrl" — never "{{ payload.actionUrl }}"',
				),
			variant: z.enum(["filled", "outline"]).nullable(),
			width: z.string().nullable(),
		}),
		type: z.enum(["button"]),
	});
}

function createMailyInlineContentSchema({ plainText = false } = {}) {
	return z.discriminatedUnion("type", [
		createMailyTextNodeSchema({ plainText }),
		createMailyVariableNodeSchema(),
		createMailyHardBreakSchema(),
		createMailyButtonSchema(),
	]);
}

function createMailyParagraphSchema({ plainText = false } = {}) {
	return z.object({
		attrs: z
			.object({
				showIfKey: z.string().nullable(),
				textAlign: z.enum(["left", "center", "right"]).nullable(),
			})
			.nullable(),
		content: z.array(createMailyInlineContentSchema({ plainText })).nullable(),
		type: z.enum(["paragraph"]),
	});
}

function createMailyHeadingSchema({ plainText = false } = {}) {
	return z.object({
		attrs: z.object({
			level: z
				.union([z.literal(1), z.literal(2), z.literal(3)])
				.describe("Heading level: 1 for main title, 2 for section, 3 for subsection"),
			showIfKey: z.string().nullable(),
			textAlign: z.enum(["left", "center", "right"]).nullable(),
		}),
		content: z.array(createMailyInlineContentSchema({ plainText })).nullable(),
		type: z.enum(["heading"]),
	});
}

function createMailySpacerSchema() {
	return z.object({
		attrs: z.object({
			height: z.number().describe("Height in pixels, typically 8, 16, 24, or 32"),
			showIfKey: z.string().nullable(),
		}),
		type: z.enum(["spacer"]),
	});
}

function createMailyDividerSchema() {
	return z.object({
		attrs: z
			.object({
				marginBottom: z.number().nullable(),
				marginTop: z.number().nullable(),
				showIfKey: z.string().nullable(),
			})
			.nullable(),
		type: z.enum(["horizontalRule"]),
	});
}

function createMailyImageSchema() {
	return z.object({
		attrs: z.object({
			aliasFor: z
				.string()
				.nullable()
				.describe(
					"Alias for the variable name like payload.items.variableName. Required only when variable is used inside the repeat node.",
				),
			alignment: z.enum(["left", "center", "right"]).nullable(),
			alt: z.string().nullable().describe("Alt text for accessibility"),
			borderRadius: z.number().nullable(),
			externalLink: z
				.string()
				.nullable()
				.describe(
					"Optional link when image is clicked. When isExternalLinkVariable is true, must be a bare variable name without curly braces",
				),
			height: z.union([z.number(), z.enum(["auto"])]).nullable(),
			isExternalLinkVariable: z
				.boolean()
				.nullable()
				.describe(
					'Set true when "externalLink" is a variable reference. The "externalLink" value must then be a bare variable name without {{ }}',
				),
			isSrcVariable: z
				.boolean()
				.nullable()
				.describe(
					'Set true when "src" is a variable reference. The "src" value must then be a bare variable name without {{ }}',
				),
			showIfKey: z.string().nullable(),
			src: z
				.string()
				.describe(
					'Image source URL. When isSrcVariable is true, must be a bare variable name without curly braces, e.g. "payload.imageUrl"',
				),
			title: z.string().nullable(),
			width: z.union([z.number(), z.enum(["auto"])]).nullable(),
		}),
		type: z.enum(["image"]),
	});
}

function createMailyInlineImageSchema() {
	return z.object({
		attrs: z.object({
			aliasFor: z
				.string()
				.nullable()
				.describe(
					"Alias for the variable name like payload.items.variableName. Required only when variable is used inside the repeat node.",
				),
			alt: z.string().nullable(),
			externalLink: z
				.string()
				.nullable()
				.describe(
					"Optional link URL. When isExternalLinkVariable is true, must be a bare variable name without curly braces",
				),
			height: z.number().nullable(),
			isExternalLinkVariable: z
				.boolean()
				.nullable()
				.describe(
					'Set true when "externalLink" is a variable reference. The "externalLink" value must then be a bare variable name without {{ }}',
				),
			isSrcVariable: z
				.boolean()
				.nullable()
				.describe(
					'Set true when "src" is a variable reference. The "src" value must then be a bare variable name without {{ }}',
				),
			showIfKey: z.string().nullable(),
			src: z
				.string()
				.describe(
					'Image source URL. When isSrcVariable is true, must be a bare variable name without curly braces, e.g. "payload.imageUrl"',
				),
			title: z.string().nullable(),
			width: z.number().nullable(),
		}),
		type: z.enum(["inlineImage"]),
	});
}

function createMailyLogoSchema() {
	return z.object({
		attrs: z.object({
			aliasFor: z
				.string()
				.nullable()
				.describe(
					"Alias for the variable name like payload.items.variableName. Required only when variable is used inside the repeat node.",
				),
			alignment: z.enum(["left", "center", "right"]).nullable(),
			alt: z.string().nullable(),
			isSrcVariable: z.boolean().nullable(),
			showIfKey: z.string().nullable(),
			size: z
				.enum(["sm", "md", "lg"])
				.nullable()
				.describe("Logo size: sm=40px, md=48px, lg=64px"),
			src: z.string().describe("Logo image URL"),
			title: z.string().nullable(),
		}),
		type: z.enum(["logo"]),
	});
}

function createMailyFooterSchema({ plainText = false } = {}) {
	return z.object({
		attrs: z
			.object({
				showIfKey: z.string().nullable(),
				textAlign: z.enum(["left", "center", "right"]).nullable(),
			})
			.nullable(),
		content: z.array(createMailyInlineContentSchema({ plainText })).nullable(),
		type: z.enum(["footer"]),
	});
}

function createMailyBlockquoteSchema({ plainText = false } = {}) {
	return z.object({
		content: z.array(createMailyParagraphSchema({ plainText })).nullable(),
		type: z.enum(["blockquote"]),
	});
}

function createMailyListItemSchema({ plainText = false } = {}) {
	return z.object({
		content: z.array(createMailyParagraphSchema({ plainText })).nullable(),
		type: z.enum(["listItem"]),
	});
}

function createMailyOrderedListSchema({ plainText = false } = {}) {
	return z.object({
		content: z.array(createMailyListItemSchema({ plainText })).nullable(),
		type: z.enum(["orderedList"]),
	});
}

function createMailyBulletListSchema({ plainText = false } = {}) {
	return z.object({
		content: z.array(createMailyListItemSchema({ plainText })).nullable(),
		type: z.enum(["bulletList"]),
	});
}

function createMailyLinkCardSchema() {
	return z.object({
		attrs: z.object({
			badgeText: z.string().nullable().describe("Badge text overlay"),
			description: z.string().nullable().describe("Card description"),
			image: z.string().nullable().describe("Card image URL"),
			link: z.string().describe("Card link URL"),
			linkTitle: z.string().nullable().describe("Link text displayed"),
			subTitle: z.string().nullable(),
			title: z.string().describe("Card title"),
		}),
		type: z.enum(["linkCard"]),
	});
}

function createMailyLeafNodeSchema({ plainText = false } = {}) {
	return z.discriminatedUnion("type", [
		createMailyLinkCardSchema(),
		createMailyDividerSchema(),
		createMailySpacerSchema(),
		createMailyButtonSchema(),
		createMailyImageSchema(),
		createMailyInlineImageSchema(),
		createMailyParagraphSchema({ plainText }),
		createMailyHeadingSchema({ plainText }),
		createMailyLogoSchema(),
	]);
}

function createMailySectionAttrsSchema() {
	return z
		.object({
			align: z.enum(["left", "center", "right"]).nullable(),
			background: z.string().nullable(),
			backgroundColor: z.string().nullable(),
			borderColor: z.string().nullable(),
			borderRadius: z.number().nullable(),
			borderStyle: z.enum(["solid", "dashed", "dotted"]).nullable(),
			borderWidth: z.number().nullable(),
			marginBottom: z.number().nullable(),
			marginLeft: z.number().nullable(),
			marginRight: z.number().nullable(),
			marginTop: z.number().nullable(),
			paddingBottom: z.number().nullable(),
			paddingLeft: z.number().nullable(),
			paddingRight: z.number().nullable(),
			paddingTop: z.number().nullable(),
			showIfKey: z.string().nullable(),
			textAlign: z.enum(["left", "center", "right"]).nullable(),
		})
		.nullable();
}

function createMailyRepeatAttrsSchema() {
	return z
		.object({
			each: z.string().nullable().describe("Variable name for the array to iterate over"),
			isUpdatingKey: z.boolean().nullable(),
			iterations: z.number().nullable().describe("Number of iterations (0 = all)"),
			showIfKey: z.string().nullable(),
		})
		.nullable();
}

function createMailyRepeatSchema({ plainText = false } = {}) {
	return z.object({
		attrs: createMailyRepeatAttrsSchema(),
		content: z.array(createMailyLeafNodeSchema({ plainText })).nullable(),
		type: z.enum(["repeat"]),
	});
}

function createMailySectionContentSchema({ plainText = false } = {}) {
	return z.discriminatedUnion("type", [
		createMailyParagraphSchema({ plainText }),
		createMailyHeadingSchema({ plainText }),
		createMailyButtonSchema(),
		createMailySpacerSchema(),
		createMailyDividerSchema(),
		createMailyImageSchema(),
		createMailyInlineImageSchema(),
		createMailyLogoSchema(),
		createMailyLinkCardSchema(),
		createMailyRepeatSchema({ plainText }),
	]);
}

function createMailySectionSchema({ plainText = false } = {}) {
	return z.object({
		attrs: createMailySectionAttrsSchema(),
		content: z.array(createMailySectionContentSchema({ plainText })).nullable(),
		type: z.enum(["section"]),
	});
}

function createMailyHtmlCodeBlockSchema() {
	return z.object({
		content: z.array(createMailyTextNodeSchema()).nullable(),
		type: z.enum(["htmlCodeBlock"]),
	});
}

function createMailyNodeSchema() {
	const plainText = { plainText: true };

	return z.discriminatedUnion("type", [
		createMailyParagraphSchema(),
		createMailyHeadingSchema(),
		createMailyButtonSchema(),
		createMailySpacerSchema(),
		createMailyDividerSchema(),
		createMailyImageSchema(),
		createMailyLogoSchema(),
		createMailyLinkCardSchema(),
		createMailyHtmlCodeBlockSchema(),
		createMailyFooterSchema(),
		createMailyBlockquoteSchema(),
		createMailyOrderedListSchema(plainText),
		createMailyBulletListSchema(plainText),
		createMailySectionSchema(plainText),
		createMailyRepeatSchema(plainText),
	]);
}

export const mailyBodySchema = z.object({
	content: z
		.array(createMailyNodeSchema())
		.describe("Array of content nodes that make up the email body"),
	type: z.enum(["doc"]).describe('Document type, always "doc"'),
});
