/**
 * Maily TipTap JSON Schema for AI Generation.
 *
 * Nodes that appear in several places are shared instances, so
 * `get_step_schema` emits each of them once instead of once per position.
 *
 * Keep in sync with the Novu Maily renderer node/mark properties.
 */
import { z } from "zod";

/** How to build a block email body, for models that only see it on demand. */
export const MAILY_BODY_GUIDE = [
	'A block email body is a Maily (TipTap) JSON object, not a string: { "type": "doc", "content": [blocks] }.',
	"Top-level blocks: paragraph, heading, button, image, logo, linkCard, spacer, horizontalRule, htmlCodeBlock, footer, blockquote, bulletList, orderedList, section, columns and repeat.",
	"paragraph, heading and footer hold inline nodes: text { text, marks? }, variable, hardBreak, button and inlineImage. Marks are bold, italic, underline, strike, code, textStyle { attrs: { color } } and link { attrs: { href } }.",
	"blockquote and listItem hold paragraphs, bulletList and orderedList hold listItems, and htmlCodeBlock holds text nodes.",
	"A section holds paragraph, heading, button, image, inlineImage, logo, linkCard, spacer, horizontalRule, footer, repeat, columns and sections. columns holds column nodes. A column, a repeat and a section inside a section hold only paragraph, heading, button, image, inlineImage, logo, linkCard, spacer and horizontalRule.",
	'Insert a variable as a variable node: { "type": "variable", "attrs": { "id": "subscriber.firstName" } }.',
	"Required attributes: variable attrs.id, button attrs.text, heading attrs.level (1, 2 or 3), spacer attrs.height, image, inlineImage and logo attrs.src, linkCard attrs.title and attrs.link, and link attrs.href. Leave out the other attributes you don't set; they are saved as null.",
	'An attribute bound to a variable (with isUrlVariable, isSrcVariable, isTextVariable or isExternalLinkVariable true) takes a bare name such as "payload.url", never "{{ payload.url }}". Inside a repeat (attrs.each: "payload.items"), set aliasFor to the item path.',
].join("\n");

const mailyMarkSchema = z.object({
	type: z.enum(["bold", "italic", "underline", "strike", "code"]),
});

const mailyTextStyleMarkSchema = z.object({
	attrs: z.object({
		color: z.string().nullable().default(null).describe("Text color in hex format"),
	}),
	type: z.enum(["textStyle"]),
});

const mailyLinkMarkSchema = z.object({
	attrs: z.object({
		aliasFor: z
			.string()
			.nullable()
			.default(null)
			.describe(
				"Alias for the variable name like payload.items.variableName. Required only when variable is used inside the repeat node.",
			),
		class: z.string().nullable().optional(),
		href: z
			.string()
			.describe(
				'Link URL. When isUrlVariable is true, must be a bare variable name without curly braces, e.g. "payload.link" — never "{{ payload.link }}"',
			),
		isUrlVariable: z
			.boolean()
			.nullable()
			.default(null)
			.describe(
				'Set true when "href" is a variable reference. The "href" value must then be a bare variable name without {{ }}',
			),
		rel: z.string().nullable().default(null),
		target: z.enum(["_blank", "_self"]).nullable().default(null),
	}),
	type: z.enum(["link"]),
});

const mailyTextNodeSchema = z.object({
	marks: z
		.array(
			z.discriminatedUnion("type", [
				mailyMarkSchema,
				mailyTextStyleMarkSchema,
				mailyLinkMarkSchema,
			]),
		)
		.nullish(),
	text: z.string(),
	type: z.enum(["text"]),
});

const mailyVariableNodeSchema = z.object({
	attrs: z.object({
		aliasFor: z
			.string()
			.nullable()
			.default(null)
			.describe(
				"Alias for the variable name like payload.items.variableName. Required only when variable is used inside the repeat node.",
			),
		fallback: z.string().nullable().default(null),
		id: z.string().describe("Variable name like subscriber.firstName or payload.companyName"),
		label: z.string().nullable().default(null),
		required: z.boolean().nullable().default(null),
	}),
	type: z.enum(["variable"]),
});

const mailyHardBreakSchema = z.object({
	type: z.enum(["hardBreak"]),
});

const mailyButtonSchema = z.object({
	attrs: z.object({
		aliasFor: z
			.string()
			.nullable()
			.default(null)
			.describe(
				"Alias for the variable name like payload.items.variableName. Required only when variable is used inside the repeat node.",
			),
		alignment: z.enum(["left", "center", "right"]).nullable().default(null),
		borderRadius: z.enum(["smooth", "sharp", "round"]).nullable().default(null),
		buttonColor: z.string().nullable().default(null).describe("Hex color like #000000"),
		isTextVariable: z
			.boolean()
			.nullable()
			.default(null)
			.describe(
				'Set true when "text" is a variable reference. The "text" value must then be a bare variable name without {{ }}',
			),
		isUrlVariable: z
			.boolean()
			.nullable()
			.default(null)
			.describe(
				'Set true when "url" is a variable reference. The "url" value must then be a bare variable name without {{ }}',
			),
		paddingBottom: z.number().nullable().default(null),
		paddingLeft: z.number().nullable().default(null),
		paddingRight: z.number().nullable().default(null),
		paddingTop: z.number().nullable().default(null),
		showIfKey: z.string().nullable().default(null),
		text: z
			.string()
			.describe(
				'Button label text. When isTextVariable is true, must be a bare variable name without curly braces, e.g. "payload.actionUrl"',
			),
		textColor: z.string().nullable().default(null).describe("Hex color like #ffffff"),
		url: z
			.string()
			.nullable()
			.default(null)
			.describe(
				'Button link URL. When isUrlVariable is true, must be a bare variable name without curly braces, e.g. "payload.actionUrl" — never "{{ payload.actionUrl }}"',
			),
		variant: z.enum(["filled", "outline"]).nullable().default(null),
		width: z.string().nullable().default(null),
	}),
	type: z.enum(["button"]),
});

const mailySpacerSchema = z.object({
	attrs: z.object({
		height: z.number().describe("Height in pixels, typically 8, 16, 24, or 32"),
		showIfKey: z.string().nullable().default(null),
	}),
	type: z.enum(["spacer"]),
});

const mailyDividerSchema = z.object({
	attrs: z
		.object({
			marginBottom: z.number().nullable().default(null),
			marginTop: z.number().nullable().default(null),
			showIfKey: z.string().nullable().optional(),
		})
		.nullable()
		.default(null),
	type: z.enum(["horizontalRule"]),
});

const mailyImageSchema = z.object({
	attrs: z.object({
		aliasFor: z
			.string()
			.nullable()
			.default(null)
			.describe(
				"Alias for the variable name like payload.items.variableName. Required only when variable is used inside the repeat node.",
			),
		alignment: z.enum(["left", "center", "right"]).nullable().default(null),
		alt: z.string().nullable().default(null).describe("Alt text for accessibility"),
		aspectRatio: z.union([z.number(), z.string()]).nullable().optional(),
		borderRadius: z.number().nullable().default(null),
		externalLink: z
			.string()
			.nullable()
			.default(null)
			.describe(
				"Optional link when image is clicked. When isExternalLinkVariable is true, must be a bare variable name without curly braces",
			),
		height: z
			.union([z.number(), z.string()])
			.nullable()
			.default(null)
			.describe('Height in pixels, or "auto"'),
		isExternalLinkVariable: z
			.boolean()
			.nullable()
			.default(null)
			.describe(
				'Set true when "externalLink" is a variable reference. The "externalLink" value must then be a bare variable name without {{ }}',
			),
		isSrcVariable: z
			.boolean()
			.nullable()
			.default(null)
			.describe(
				'Set true when "src" is a variable reference. The "src" value must then be a bare variable name without {{ }}',
			),
		lockAspectRatio: z.boolean().nullable().optional(),
		showIfKey: z.string().nullable().default(null),
		src: z
			.string()
			.describe(
				'Image source URL. When isSrcVariable is true, must be a bare variable name without curly braces, e.g. "payload.imageUrl"',
			),
		title: z.string().nullable().default(null),
		width: z
			.union([z.number(), z.string()])
			.nullable()
			.default(null)
			.describe('Width in pixels, or "auto"'),
	}),
	type: z.enum(["image"]),
});

const mailyInlineImageSchema = z.object({
	attrs: z.object({
		aliasFor: z
			.string()
			.nullable()
			.default(null)
			.describe(
				"Alias for the variable name like payload.items.variableName. Required only when variable is used inside the repeat node.",
			),
		alt: z.string().nullable().default(null),
		externalLink: z
			.string()
			.nullable()
			.default(null)
			.describe(
				"Optional link URL. When isExternalLinkVariable is true, must be a bare variable name without curly braces",
			),
		height: z.number().nullable().default(null),
		isExternalLinkVariable: z
			.boolean()
			.nullable()
			.default(null)
			.describe(
				'Set true when "externalLink" is a variable reference. The "externalLink" value must then be a bare variable name without {{ }}',
			),
		isSrcVariable: z
			.boolean()
			.nullable()
			.default(null)
			.describe(
				'Set true when "src" is a variable reference. The "src" value must then be a bare variable name without {{ }}',
			),
		showIfKey: z.string().nullable().optional(),
		src: z
			.string()
			.describe(
				'Image source URL. When isSrcVariable is true, must be a bare variable name without curly braces, e.g. "payload.imageUrl"',
			),
		title: z.string().nullable().default(null),
		width: z.number().nullable().default(null),
	}),
	type: z.enum(["inlineImage"]),
});

const mailyInlineContentSchema = z.discriminatedUnion("type", [
	mailyTextNodeSchema,
	mailyVariableNodeSchema,
	mailyHardBreakSchema,
	mailyButtonSchema,
	mailyInlineImageSchema,
]);

const mailyParagraphSchema = z.object({
	attrs: z
		.object({
			showIfKey: z.string().nullable().default(null),
			textAlign: z.enum(["left", "center", "right"]).nullable().default(null),
		})
		.nullable()
		.default(null),
	content: z.array(mailyInlineContentSchema).nullable().optional(),
	type: z.enum(["paragraph"]),
});

const mailyHeadingSchema = z.object({
	attrs: z.object({
		level: z
			.literal([1, 2, 3])
			.describe("Heading level: 1 for main title, 2 for section, 3 for subsection"),
		showIfKey: z.string().nullable().default(null),
		textAlign: z.enum(["left", "center", "right"]).nullable().default(null),
	}),
	content: z.array(mailyInlineContentSchema).nullable().optional(),
	type: z.enum(["heading"]),
});

const mailyLogoSchema = z.object({
	attrs: z.object({
		aliasFor: z
			.string()
			.nullable()
			.default(null)
			.describe(
				"Alias for the variable name like payload.items.variableName. Required only when variable is used inside the repeat node.",
			),
		alignment: z.enum(["left", "center", "right"]).nullable().default(null),
		alt: z.string().nullable().default(null),
		isSrcVariable: z.boolean().nullable().default(null),
		showIfKey: z.string().nullable().default(null),
		size: z
			.enum(["sm", "md", "lg"])
			.nullable()
			.default(null)
			.describe("Logo size: sm=40px, md=48px, lg=64px"),
		src: z.string().describe("Logo image URL"),
		title: z.string().nullable().default(null),
	}),
	type: z.enum(["logo"]),
});

const mailyFooterSchema = z.object({
	attrs: z
		.object({
			"maily-component": z.string().nullable().optional(),
			showIfKey: z.string().nullable().optional(),
			textAlign: z.enum(["left", "center", "right"]).nullable().default(null),
		})
		.nullable()
		.default(null),
	content: z.array(mailyInlineContentSchema).nullable().optional(),
	type: z.enum(["footer"]),
});

const mailyBlockquoteSchema = z.object({
	content: z.array(mailyParagraphSchema).nullable().default(null),
	type: z.enum(["blockquote"]),
});

const mailyListItemSchema = z.object({
	content: z.array(mailyParagraphSchema).nullable().default(null),
	type: z.enum(["listItem"]),
});

const mailyOrderedListSchema = z.object({
	content: z.array(mailyListItemSchema).nullable().default(null),
	type: z.enum(["orderedList"]),
});

const mailyBulletListSchema = z.object({
	content: z.array(mailyListItemSchema).nullable().default(null),
	type: z.enum(["bulletList"]),
});

const mailyLinkCardSchema = z.object({
	attrs: z.object({
		badgeText: z.string().nullable().default(null).describe("Badge text overlay"),
		description: z.string().nullable().default(null).describe("Card description"),
		image: z.string().nullable().default(null).describe("Card image URL"),
		link: z.string().describe("Card link URL"),
		linkTitle: z.string().nullable().default(null).describe("Link text displayed"),
		subTitle: z.string().nullable().default(null),
		title: z.string().describe("Card title"),
	}),
	type: z.enum(["linkCard"]),
});

const mailyLeafNodeSchema = z.discriminatedUnion("type", [
	mailyLinkCardSchema,
	mailyDividerSchema,
	mailySpacerSchema,
	mailyButtonSchema,
	mailyImageSchema,
	mailyInlineImageSchema,
	mailyParagraphSchema,
	mailyHeadingSchema,
	mailyLogoSchema,
]);

const mailySectionAttrsSchema = z
	.object({
		align: z.enum(["left", "center", "right"]).nullable().default(null),
		background: z.string().nullable().optional(),
		backgroundColor: z.string().nullable().default(null),
		borderColor: z.string().nullable().default(null),
		borderRadius: z.number().nullable().default(null),
		borderStyle: z.enum(["solid", "dashed", "dotted"]).nullable().optional(),
		borderWidth: z.number().nullable().default(null),
		marginBottom: z.number().nullable().default(null),
		marginLeft: z.number().nullable().default(null),
		marginRight: z.number().nullable().default(null),
		marginTop: z.number().nullable().default(null),
		paddingBottom: z.number().nullable().default(null),
		paddingLeft: z.number().nullable().default(null),
		paddingRight: z.number().nullable().default(null),
		paddingTop: z.number().nullable().default(null),
		showIfKey: z.string().nullable().default(null),
		textAlign: z.enum(["left", "center", "right"]).nullable().optional(),
	})
	.nullable()
	.default(null);

const mailyRepeatAttrsSchema = z
	.object({
		each: z
			.string()
			.nullable()
			.default(null)
			.describe("Variable name for the array to iterate over"),
		isUpdatingKey: z.boolean().nullable().default(null),
		iterations: z.number().nullable().default(null).describe("Number of iterations (0 = all)"),
		showIfKey: z.string().nullable().default(null),
	})
	.nullable()
	.default(null);

const mailyRepeatSchema = z.object({
	attrs: mailyRepeatAttrsSchema,
	content: z.array(mailyLeafNodeSchema).nullable().default(null),
	type: z.enum(["repeat"]),
});

const mailyColumnSchema = z.object({
	attrs: z
		.object({
			columnId: z.string().nullable().default(null),
			verticalAlign: z.enum(["top", "middle", "bottom"]).nullable().default(null),
			width: z
				.union([z.number(), z.string()])
				.nullable()
				.default(null)
				.describe('Width in percent of the row, or "auto" to share the row equally'),
		})
		.nullable()
		.default(null),
	content: z.array(mailyLeafNodeSchema).nullable().default(null),
	type: z.enum(["column"]),
});

/** A row of columns side by side; each column holds the blocks a repeat holds. */
const mailyColumnsSchema = z.object({
	attrs: z
		.object({
			gap: z
				.number()
				.nullable()
				.default(null)
				.describe("Space between the columns in pixels"),
			marginBottom: z.number().nullable().default(null),
			showIfKey: z.string().nullable().default(null),
		})
		.nullable()
		.default(null),
	content: z.array(mailyColumnSchema).describe("The columns, left to right"),
	type: z.enum(["columns"]),
});

/** A section inside a section, as the dashboard's card blocks nest them. */
const mailyInnerSectionSchema = z.object({
	attrs: mailySectionAttrsSchema,
	content: z.array(mailyLeafNodeSchema).nullable().default(null),
	type: z.enum(["section"]),
});

const mailySectionContentSchema = z.discriminatedUnion("type", [
	mailyParagraphSchema,
	mailyHeadingSchema,
	mailyButtonSchema,
	mailySpacerSchema,
	mailyDividerSchema,
	mailyImageSchema,
	mailyInlineImageSchema,
	mailyLogoSchema,
	mailyLinkCardSchema,
	mailyFooterSchema,
	mailyRepeatSchema,
	mailyColumnsSchema,
	mailyInnerSectionSchema,
]);

const mailySectionSchema = z.object({
	attrs: mailySectionAttrsSchema,
	content: z.array(mailySectionContentSchema).nullable().default(null),
	type: z.enum(["section"]),
});

const mailyHtmlCodeBlockSchema = z.object({
	content: z.array(mailyTextNodeSchema).nullable().default(null),
	type: z.enum(["htmlCodeBlock"]),
});

const mailyNodeSchema = z.discriminatedUnion("type", [
	mailyParagraphSchema,
	mailyHeadingSchema,
	mailyButtonSchema,
	mailySpacerSchema,
	mailyDividerSchema,
	mailyImageSchema,
	mailyLogoSchema,
	mailyLinkCardSchema,
	mailyHtmlCodeBlockSchema,
	mailyFooterSchema,
	mailyBlockquoteSchema,
	mailyOrderedListSchema,
	mailyBulletListSchema,
	mailySectionSchema,
	mailyColumnsSchema,
	mailyRepeatSchema,
]);

export const mailyBodySchema = z.object({
	content: z
		.array(mailyNodeSchema)
		.describe("Array of content nodes that make up the email body"),
	type: z.enum(["doc"]).describe('Document type, always "doc"'),
});
