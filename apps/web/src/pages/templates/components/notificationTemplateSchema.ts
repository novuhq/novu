import * as z from 'zod';
import {
  ChannelTypeEnum,
  StepTypeEnum,
  DelayTypeEnum,
  DigestTypeEnum,
  DigestUnitEnum,
  DaysEnum,
  MonthlyTypeEnum,
  OrdinalEnum,
  OrdinalValueEnum,
} from '@novu/shared';

import { getChannel } from '../../../utils/channels';

const validateAmount = ({
  ctx,
  amount,
  unit,
  message,
  path,
}: {
  ctx: z.RefinementCtx;
  amount?: string | number;
  unit?: string;
  message: string;
  path: string[];
}) => {
  const amountNumber = parseInt(`${amount ?? ''}`, 10);

  if (!amountNumber) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message,
      path,
    });
  }

  if (unit === 'hours' && amountNumber > 24) {
    ctx.addIssue({
      code: z.ZodIssueCode.too_big,
      maximum: 24,
      type: 'number',
      inclusive: true,
      message: 'Hours must be 24 or below',
      path: path,
    });
  }

  if (unit === 'days' && amountNumber > 31) {
    ctx.addIssue({
      code: z.ZodIssueCode.too_big,
      maximum: 31,
      type: 'number',
      inclusive: true,
      message: 'Days must be 31 or below',
      path: path,
    });
  }
};

const validateUnit = ({
  ctx,
  unit,
  message,
  path,
}: {
  ctx: z.RefinementCtx;
  unit?: string;
  message: string;
  path: string[];
}) => {
  if (!unit) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message,
      path,
    });
  }
};

const digestMetadataSchema = z.object({
  type: z.enum([DigestTypeEnum.REGULAR, DigestTypeEnum.TIMED]),
  digestKey: z.string().optional(),
  [DigestTypeEnum.REGULAR]: z
    .object({
      amount: z.string(),
      unit: z.enum([DigestUnitEnum.SECONDS, DigestUnitEnum.MINUTES, DigestUnitEnum.HOURS, DigestUnitEnum.DAYS]),
      backoff: z.boolean().optional(),
      backoffAmount: z.string().optional(),
      backoffUnit: z
        .enum([DigestUnitEnum.SECONDS, DigestUnitEnum.MINUTES, DigestUnitEnum.HOURS, DigestUnitEnum.DAYS])
        .optional(),
    })
    .passthrough()
    .optional(),
  [DigestTypeEnum.TIMED]: z
    .object({
      unit: z.enum([
        DigestUnitEnum.MINUTES,
        DigestUnitEnum.HOURS,
        DigestUnitEnum.DAYS,
        DigestUnitEnum.WEEKS,
        DigestUnitEnum.MONTHS,
      ]),
      [DigestUnitEnum.MINUTES]: z
        .object({
          amount: z.string(),
        })
        .passthrough()
        .optional(),
      [DigestUnitEnum.HOURS]: z
        .object({
          amount: z.string(),
        })
        .passthrough()
        .optional(),
      [DigestUnitEnum.DAYS]: z
        .object({
          amount: z.string(),
          atTime: z.string(),
        })
        .passthrough()
        .optional(),
      [DigestUnitEnum.WEEKS]: z
        .object({
          amount: z.string(),
          atTime: z.string(),
          weekDays: z.array(
            z.enum([
              DaysEnum.MONDAY,
              DaysEnum.TUESDAY,
              DaysEnum.WEDNESDAY,
              DaysEnum.THURSDAY,
              DaysEnum.FRIDAY,
              DaysEnum.SATURDAY,
              DaysEnum.SUNDAY,
            ])
          ),
        })
        .passthrough()
        .optional(),
      [DigestUnitEnum.MONTHS]: z
        .object({
          amount: z.string(),
          atTime: z.string(),
          monthDays: z.array(z.number()),
          monthlyType: z.enum([MonthlyTypeEnum.EACH, MonthlyTypeEnum.ON]),
          ordinal: z
            .enum([
              OrdinalEnum.FIRST,
              OrdinalEnum.SECOND,
              OrdinalEnum.THIRD,
              OrdinalEnum.FOURTH,
              OrdinalEnum.FIFTH,
              OrdinalEnum.LAST,
            ])
            .optional(),
          ordinalValue: z
            .enum([
              OrdinalValueEnum.DAY,
              OrdinalValueEnum.WEEKDAY,
              OrdinalValueEnum.WEEKEND,
              OrdinalValueEnum.MONDAY,
              OrdinalValueEnum.TUESDAY,
              OrdinalValueEnum.WEDNESDAY,
              OrdinalValueEnum.THURSDAY,
              OrdinalValueEnum.FRIDAY,
              OrdinalValueEnum.SATURDAY,
              OrdinalValueEnum.SUNDAY,
            ])
            .optional(),
        })
        .passthrough()
        .optional(),
    })
    .passthrough()
    .optional(),
});

const delayMetadataSchema = z
  .object({
    type: z.enum([DelayTypeEnum.REGULAR, DelayTypeEnum.SCHEDULED]),
    [DelayTypeEnum.REGULAR]: z
      .object({
        amount: z.string(),
        unit: z.string(),
      })
      .passthrough()
      .optional(),
    [DelayTypeEnum.SCHEDULED]: z
      .object({
        delayPath: z.string(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const templateSchema = z
  .object({
    content: z.any(),
    subject: z.any(),
    title: z.any(),
    layoutId: z.any().optional(),
    senderName: z.any().optional(),
  })
  .passthrough();

const variantSchema = z.object({
  template: templateSchema.superRefine((template, ctx) => {
    validateTemplate(template, ctx);
  }),
  digestMetadata: digestMetadataSchema.optional(),
  delayMetadata: delayMetadataSchema.optional(),
});

const validateTemplate = (template, ctx) => {
  if (
    (template.type === ChannelTypeEnum.SMS ||
      template.type === ChannelTypeEnum.IN_APP ||
      template.type === ChannelTypeEnum.PUSH ||
      template.type === ChannelTypeEnum.CHAT) &&
    template.content?.length === 0
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.too_small,
      minimum: 1,
      type: 'string',
      inclusive: true,
      message: `Message content is missing!`,
      path: ['content'],
    });
  }
  if (template.type === ChannelTypeEnum.EMAIL) {
    if (!template.subject) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 1,
        type: 'string',
        inclusive: true,
        message: 'Email subject is missing!',
        path: ['subject'],
      });
    }
  }

  if (template.type === ChannelTypeEnum.PUSH && !template.title) {
    ctx.addIssue({
      code: z.ZodIssueCode.too_small,
      minimum: 1,
      type: 'string',
      inclusive: true,
      message: 'Message title is missing!',
      path: ['title'],
    });
  }
};

export const schema = z
  .object({
    payloadSchema: z.any().optional(),
    name: z
      .string({
        required_error: 'Required - Workflow Name',
      })
      .superRefine((data, ctx) => {
        if (data.replaceAll(/\s/g, '').length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.too_small,
            minimum: 1,
            type: 'string',
            inclusive: true,
            message: 'Required - Workflow Name',
          });
        }
      }),
    notificationGroupId: z
      .string({
        invalid_type_error: 'Required - Workflow Group',
      })
      .superRefine((data, ctx) => {
        if (data.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.too_small,
            minimum: 1,
            type: 'string',
            inclusive: true,
            message: 'Required - Workflow Group',
          });
        }
      }),
    steps: z
      .array(
        z
          .object({
            ...variantSchema.shape,
            variants: z.array(variantSchema.passthrough()).optional(),
          })
          .passthrough()
          .superRefine((step, ctx) => {
            if (step.template.type !== StepTypeEnum.DIGEST && step.template.type !== StepTypeEnum.DELAY) {
              return;
            }

            if (step.delayMetadata?.type === DelayTypeEnum.REGULAR) {
              validateAmount({
                ctx,
                amount: step.delayMetadata?.regular?.amount,
                unit: step.delayMetadata?.regular?.unit,
                message: `Required - ${getChannel(step.template.type)?.label} Amount`,
                path: ['delayMetadata', 'regular', 'amount'],
              });
              validateUnit({
                ctx,
                unit: step.delayMetadata?.regular?.unit,
                message: 'Time interval is missing!',
                path: ['delayMetadata', 'regular', 'unit'],
              });

              return;
            }

            if (step.delayMetadata?.type === DelayTypeEnum.SCHEDULED) {
              if (!step.delayMetadata?.scheduled?.delayPath) {
                ctx.addIssue({
                  code: z.ZodIssueCode.too_small,
                  minimum: 1,
                  type: 'string',
                  inclusive: true,
                  message: 'Path scheduled is missing!',
                  path: ['delayMetadata', 'scheduled', 'delayPath'],
                });
              }

              return;
            }
          })
      )
      .optional(),
  })
  .passthrough();
