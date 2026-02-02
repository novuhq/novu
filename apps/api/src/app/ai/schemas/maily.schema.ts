import { z } from 'zod';

/**
 * Maily TipTap JSON Schema for AI Generation
 * IMPORTANT: OpenAI structured outputs have a 10-level nesting limit.
 * Additionally, OpenAI's strict mode doesn't support recursive schemas (z.lazy), so we use
 * a flat structure with the most commonly used email elements.
 * We use .nullable() for optional fields - OpenAI strict mode requires all properties to be
 * in the 'required' array, but allows null values.
 * It should be in sync with the libs/maily-render/src/maily.tsx file and properties of nodes and marks.
 */

const mailyMarkSchema = z.object({
  type: z.enum(['bold', 'italic', 'underline', 'strike', 'code']),
});

const mailyTextStyleMarkSchema = z.object({
  type: z.literal('textStyle'),
  attrs: z.object({
    color: z.string().nullable().describe('Text color in hex format'),
  }),
});

const mailyLinkMarkSchema = z.object({
  type: z.literal('link'),
  attrs: z.object({
    href: z.string().describe('Link URL'),
    target: z.enum(['_blank', '_self']).nullable(),
    rel: z.string().nullable(),
    isUrlVariable: z.boolean().nullable(),
    aliasFor: z
      .string()
      .nullable()
      .describe(
        'Alias for the variable name like payload.items.variableName. Required only when variable is used inside the repeat node.'
      ),
  }),
});

const mailyTextNodeSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
  marks: z.array(z.union([mailyMarkSchema, mailyTextStyleMarkSchema, mailyLinkMarkSchema])).nullable(),
});

const mailyVariableNodeSchema = z.object({
  type: z.literal('variable'),
  attrs: z.object({
    id: z.string().describe('Variable name like subscriber.firstName or payload.companyName'),
    aliasFor: z
      .string()
      .nullable()
      .describe(
        'Alias for the variable name like payload.items.variableName. Required only when variable is used inside the repeat node.'
      ),
    fallback: z.string().nullable(),
  }),
});

const mailyHardBreakSchema = z.object({
  type: z.literal('hardBreak'),
});

const mailyInlineContentSchema = z.union([mailyTextNodeSchema, mailyVariableNodeSchema, mailyHardBreakSchema]);

const mailyParagraphSchema = z.object({
  type: z.literal('paragraph'),
  attrs: z
    .object({
      textAlign: z.enum(['left', 'center', 'right']).nullable(),
    })
    .nullable(),
  content: z.array(mailyInlineContentSchema).nullable(),
});

const mailyHeadingSchema = z.object({
  type: z.literal('heading'),
  attrs: z.object({
    level: z
      .union([z.literal(1), z.literal(2), z.literal(3)])
      .describe('Heading level: 1 for main title, 2 for section, 3 for subsection'),
    textAlign: z.enum(['left', 'center', 'right']).nullable(),
  }),
  content: z.array(mailyInlineContentSchema).nullable(),
});

const mailyButtonSchema = z.object({
  type: z.literal('button'),
  attrs: z.object({
    text: z.string().describe('Button label text'),
    url: z.string().nullable().describe('Button link URL'),
    isTextVariable: z.boolean().nullable(),
    isUrlVariable: z.boolean().nullable(),
    alignment: z.enum(['left', 'center', 'right']).nullable(),
    variant: z.enum(['filled', 'outline']).nullable(),
    borderRadius: z.enum(['smooth', 'sharp', 'round']).nullable(),
    buttonColor: z.string().nullable().describe('Hex color like #000000'),
    textColor: z.string().nullable().describe('Hex color like #ffffff'),
    paddingTop: z.number().nullable(),
    paddingRight: z.number().nullable(),
    paddingBottom: z.number().nullable(),
    paddingLeft: z.number().nullable(),
    width: z.string().nullable(),
    aliasFor: z
      .string()
      .nullable()
      .describe(
        'Alias for the variable name like payload.items.variableName. Required only when variable is used inside the repeat node.'
      ),
  }),
});

const mailySpacerSchema = z.object({
  type: z.literal('spacer'),
  attrs: z.object({
    height: z.number().describe('Height in pixels, typically 8, 16, 24, or 32'),
  }),
});

const mailyDividerSchema = z.object({
  type: z.literal('horizontalRule'),
  attrs: z
    .object({
      marginTop: z.number().nullable(),
      marginBottom: z.number().nullable(),
    })
    .nullable(),
});

const mailyImageSchema = z.object({
  type: z.literal('image'),
  attrs: z.object({
    src: z.string().describe('Image source URL'),
    isSrcVariable: z.boolean().nullable(),
    alt: z.string().nullable().describe('Alt text for accessibility'),
    title: z.string().nullable(),
    width: z.union([z.number(), z.literal('auto')]).nullable(),
    height: z.union([z.number(), z.literal('auto')]).nullable(),
    alignment: z.enum(['left', 'center', 'right']).nullable(),
    externalLink: z.string().nullable().describe('Optional link when image is clicked'),
    isExternalLinkVariable: z.boolean().nullable(),
    borderRadius: z.number().nullable(),
    aliasFor: z
      .string()
      .nullable()
      .describe(
        'Alias for the variable name like payload.items.variableName. Required only when variable is used inside the repeat node.'
      ),
  }),
});

const mailyInlineImageSchema = z.object({
  type: z.literal('inlineImage'),
  attrs: z.object({
    height: z.number().nullable(),
    width: z.number().nullable(),
    src: z.string().describe('Image source URL'),
    isSrcVariable: z.boolean().nullable(),
    alt: z.string().nullable(),
    title: z.string().nullable(),
    externalLink: z.string().nullable(),
    isExternalLinkVariable: z.boolean().nullable(),
    aliasFor: z
      .string()
      .nullable()
      .describe(
        'Alias for the variable name like payload.items.variableName. Required only when variable is used inside the repeat node.'
      ),
  }),
});

const mailyLogoSchema = z.object({
  type: z.literal('logo'),
  attrs: z.object({
    src: z.string().describe('Logo image URL'),
    isSrcVariable: z.boolean().nullable(),
    alt: z.string().nullable(),
    title: z.string().nullable(),
    size: z.enum(['sm', 'md', 'lg']).nullable().describe('Logo size: sm=40px, md=48px, lg=64px'),
    alignment: z.enum(['left', 'center', 'right']).nullable(),
    aliasFor: z
      .string()
      .nullable()
      .describe(
        'Alias for the variable name like payload.items.variableName. Required only when variable is used inside the repeat node.'
      ),
  }),
});

const mailyFooterSchema = z.object({
  type: z.literal('footer'),
  attrs: z
    .object({
      textAlign: z.enum(['left', 'center', 'right']).nullable(),
    })
    .nullable(),
  content: z.array(mailyInlineContentSchema).nullable(),
});

const mailyBlockquoteSchema = z.object({
  type: z.literal('blockquote'),
  content: z.array(mailyParagraphSchema).nullable(),
});

const mailyListItemSchema = z.object({
  type: z.literal('listItem'),
  content: z.array(mailyParagraphSchema).nullable(),
});

const mailyOrderedListSchema = z.object({
  type: z.literal('orderedList'),
  content: z.array(mailyListItemSchema).nullable(),
});

const mailyBulletListSchema = z.object({
  type: z.literal('bulletList'),
  content: z.array(mailyListItemSchema).nullable(),
});

const mailyLinkCardSchema = z.object({
  type: z.literal('linkCard'),
  attrs: z.object({
    title: z.string().describe('Card title'),
    description: z.string().nullable().describe('Card description'),
    link: z.string().describe('Card link URL'),
    linkTitle: z.string().nullable().describe('Link text displayed'),
    image: z.string().nullable().describe('Card image URL'),
    badgeText: z.string().nullable().describe('Badge text overlay'),
    subTitle: z.string().nullable(),
  }),
});

const mailyLeafNodeSchema = z.union([
  mailyParagraphSchema,
  mailyHeadingSchema,
  mailyButtonSchema,
  mailySpacerSchema,
  mailyDividerSchema,
  mailyImageSchema,
  mailyInlineImageSchema,
  mailyLogoSchema,
  mailyFooterSchema,
  mailyBlockquoteSchema,
  mailyOrderedListSchema,
  mailyBulletListSchema,
  mailyLinkCardSchema,
]);

const mailyColumnSchema = z.object({
  type: z.literal('column'),
  attrs: z
    .object({
      width: z.union([z.number(), z.literal('auto')]).nullable(),
      verticalAlign: z.enum(['top', 'middle', 'bottom']).nullable(),
    })
    .nullable(),
  content: z.array(mailyLeafNodeSchema).nullable(),
});

const mailyColumnsSchema = z.object({
  type: z.literal('columns'),
  attrs: z
    .object({
      gap: z.number().nullable(),
      marginBottom: z.number().nullable(),
    })
    .nullable(),
  content: z.array(mailyColumnSchema).nullable(),
});

const mailySectionAttrsSchema = z
  .object({
    backgroundColor: z.string().nullable(),
    background: z.string().nullable(),
    borderRadius: z.number().nullable(),
    borderWidth: z.number().nullable(),
    borderColor: z.string().nullable(),
    borderStyle: z.enum(['solid', 'dashed', 'dotted']).nullable(),
    paddingTop: z.number().nullable(),
    paddingRight: z.number().nullable(),
    paddingBottom: z.number().nullable(),
    paddingLeft: z.number().nullable(),
    marginTop: z.number().nullable(),
    marginBottom: z.number().nullable(),
    textAlign: z.enum(['left', 'center', 'right']).nullable(),
  })
  .nullable();

const mailyRepeatAttrsSchema = z
  .object({
    each: z.string().nullable().describe('Variable name for the array to iterate over'),
    iterations: z.number().nullable().describe('Number of iterations (0 = all)'),
  })
  .nullable();

const mailySectionSchema = z.object({
  type: z.literal('section'),
  attrs: mailySectionAttrsSchema,
  content: z.array(mailyLeafNodeSchema).nullable(),
});

const mailyRepeatSchema = z.object({
  type: z.literal('repeat'),
  attrs: mailyRepeatAttrsSchema,
  content: z.array(mailyLeafNodeSchema).nullable(),
});

const mailyHtmlCodeBlockSchema = z.object({
  type: z.literal('htmlCodeBlock'),
  content: z.array(mailyTextNodeSchema).nullable(),
});

const mailyNodeSchema = z.union([
  mailyParagraphSchema,
  mailyHeadingSchema,
  mailyButtonSchema,
  mailySpacerSchema,
  mailyDividerSchema,
  mailyImageSchema,
  mailyLogoSchema,
  mailyFooterSchema,
  mailyBlockquoteSchema,
  mailyOrderedListSchema,
  mailyBulletListSchema,
  mailyLinkCardSchema,
  mailyHtmlCodeBlockSchema,
  mailySectionSchema,
  mailyRepeatSchema,
  // NOTE: columns schema is disabled for AI generation
  // because it creates 10+ levels of nesting, exceeding OpenAI's limit of 10 levels.
  // Complex layouts should use HTML editorType instead of Maily JSON.
  // mailyColumnsSchema,
]);

export const mailyBodySchema = z.object({
  type: z.literal('doc').describe('Document type, always "doc"'),
  content: z.array(mailyNodeSchema).describe('Array of content nodes that make up the email body'),
});
