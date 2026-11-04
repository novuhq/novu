/**
 * Maily TipTap JSON Schema for AI Generation.
 *
 * Nodes that appear in several places are shared instances, so
 * `get_step_schema` emits each of them once instead of once per position.
 *
 * Keep in sync with the Novu Maily renderer node/mark properties.
 */
import { z } from "zod";

const mailyMarkSchema = z.object({
	type: z.enum(["bold", "italic", "underline", "strike", "code"]),
});

const mailyTextStyleMarkSchema = z.object({
	attrs: z.object({
		color: z.string().nullable().describe("Text color in hex format"),
	}),
	type: z.enum(["textStyle"]),
});

const mailyLinkMarkSchema = z.object({
	attrs: z.object({
		aliasFor: z
			.string()
			.nullable()
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
			.describe(
				'Set true when "href" is a variable reference. The "href" value must then be a bare variable name without {{ }}',
			),
		rel: z.string().nullable(),
		target: z.enum(["_blank", "_self"]).nullable(),
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
			.describe(
				"Alias for the variable name like payload.items.variableName. Required only when variable is used inside the repeat node.",
			),
		fallback: z.string().nullable(),
		id: z.string().describe("Variable name like subscriber.firstName or payload.companyName"),
		label: z.string().nullable(),
		required: z.boolean().nullable(),
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

const mailySpacerSchema = z.object({
	attrs: z.object({
		height: z.number().describe("Height in pixels, typically 8, 16, 24, or 32"),
		showIfKey: z.string().nullable(),
	}),
	type: z.enum(["spacer"]),
});

const mailyDividerSchema = z.object({
	attrs: z
		.object({
			marginBottom: z.number().nullable(),
			marginTop: z.number().nullable(),
			showIfKey: z.string().nullable().optional(),
		})
		.nullable(),
	type: z.enum(["horizontalRule"]),
});

const mailyImageSchema = z.object({
	attrs: z.object({
		aliasFor: z
			.string()
			.nullable()
			.describe(
				"Alias for the variable name like payload.items.variableName. Required only when variable is used inside the repeat node.",
			),
		alignment: z.enum(["left", "center", "right"]).nullable(),
		alt: z.string().nullable().describe("Alt text for accessibility"),
		aspectRatio: z.union([z.number(), z.string()]).nullable().optional(),
		borderRadius: z.number().nullable(),
		externalLink: z
			.string()
			.nullable()
			.describe(
				"Optional link when image is clicked. When isExternalLinkVariable is true, must be a bare variable name without curly braces",
			),
		height: z
			.union([z.number(), z.string()])
			.nullable()
			.describe('Height in pixels, or "auto"'),
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
		lockAspectRatio: z.boolean().nullable().optional(),
		showIfKey: z.string().nullable(),
		src: z
			.string()
			.describe(
				'Image source URL. When isSrcVariable is true, must be a bare variable name without curly braces, e.g. "payload.imageUrl"',
			),
		title: z.string().nullable(),
		width: z.union([z.number(), z.string()]).nullable().describe('Width in pixels, or "auto"'),
	}),
	type: z.enum(["image"]),
});

const mailyInlineImageSchema = z.object({
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
		showIfKey: z.string().nullable().optional(),
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
			showIfKey: z.string().nullable(),
			textAlign: z.enum(["left", "center", "right"]).nullable(),
		})
		.nullable(),
	content: z.array(mailyInlineContentSchema).nullable().optional(),
	type: z.enum(["paragraph"]),
});

const mailyHeadingSchema = z.object({
	attrs: z.object({
		level: z
			.union([z.literal(1), z.literal(2), z.literal(3)])
			.describe("Heading level: 1 for main title, 2 for section, 3 for subsection"),
		showIfKey: z.string().nullable(),
		textAlign: z.enum(["left", "center", "right"]).nullable(),
	}),
	content: z.array(mailyInlineContentSchema).nullable().optional(),
	type: z.enum(["heading"]),
});

const mailyLogoSchema = z.object({
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

const mailyFooterSchema = z.object({
	attrs: z
		.object({
			"maily-component": z.string().nullable().optional(),
			showIfKey: z.string().nullable().optional(),
			textAlign: z.enum(["left", "center", "right"]).nullable(),
		})
		.nullable(),
	content: z.array(mailyInlineContentSchema).nullable().optional(),
	type: z.enum(["footer"]),
});

const mailyBlockquoteSchema = z.object({
	content: z.array(mailyParagraphSchema).nullable(),
	type: z.enum(["blockquote"]),
});

const mailyListItemSchema = z.object({
	content: z.array(mailyParagraphSchema).nullable(),
	type: z.enum(["listItem"]),
});

const mailyOrderedListSchema = z.object({
	content: z.array(mailyListItemSchema).nullable(),
	type: z.enum(["orderedList"]),
});

const mailyBulletListSchema = z.object({
	content: z.array(mailyListItemSchema).nullable(),
	type: z.enum(["bulletList"]),
});

const mailyLinkCardSchema = z.object({
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
		align: z.enum(["left", "center", "right"]).nullable(),
		background: z.string().nullable().optional(),
		backgroundColor: z.string().nullable(),
		borderColor: z.string().nullable(),
		borderRadius: z.number().nullable(),
		borderStyle: z.enum(["solid", "dashed", "dotted"]).nullable().optional(),
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
		textAlign: z.enum(["left", "center", "right"]).nullable().optional(),
	})
	.nullable();

const mailyRepeatAttrsSchema = z
	.object({
		each: z.string().nullable().describe("Variable name for the array to iterate over"),
		isUpdatingKey: z.boolean().nullable(),
		iterations: z.number().nullable().describe("Number of iterations (0 = all)"),
		showIfKey: z.string().nullable(),
	})
	.nullable();

const mailyRepeatSchema = z.object({
	attrs: mailyRepeatAttrsSchema,
	content: z.array(mailyLeafNodeSchema).nullable(),
	type: z.enum(["repeat"]),
});

const mailyColumnSchema = z.object({
	attrs: z
		.object({
			columnId: z.string().nullable(),
			verticalAlign: z.enum(["top", "middle", "bottom"]).nullable(),
			width: z
				.union([z.number(), z.string()])
				.nullable()
				.describe('Width in percent of the row, or "auto" to share the row equally'),
		})
		.nullable(),
	content: z.array(mailyLeafNodeSchema).nullable(),
	type: z.enum(["column"]),
});

/** A row of columns side by side; each column holds the blocks a repeat holds. */
const mailyColumnsSchema = z.object({
	attrs: z
		.object({
			gap: z.number().nullable().describe("Space between the columns in pixels"),
			marginBottom: z.number().nullable(),
			showIfKey: z.string().nullable(),
		})
		.nullable(),
	content: z.array(mailyColumnSchema).describe("The columns, left to right"),
	type: z.enum(["columns"]),
});

/** A section inside a section, as the dashboard's card blocks nest them. */
const mailyInnerSectionSchema = z.object({
	attrs: mailySectionAttrsSchema,
	content: z.array(mailyLeafNodeSchema).nullable(),
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
	content: z.array(mailySectionContentSchema).nullable(),
	type: z.enum(["section"]),
});

const mailyHtmlCodeBlockSchema = z.object({
	content: z.array(mailyTextNodeSchema).nullable(),
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
