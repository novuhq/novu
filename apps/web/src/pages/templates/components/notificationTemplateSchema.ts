import * as z from 'zod';
import { ChannelTypeEnum, DigestTypeEnum, StepTypeEnum, DelayTypeEnum } from '@novu/shared';

import { getChannel } from '../shared/channels';

export const schema = z
  .object({
    name: z
      .string({
        required_error: 'Required - Notification Name',
      })
      .superRefine((data, ctx) => {
        if (data.replaceAll(/\s/g, '').length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.too_small,
            minimum: 1,
            type: 'string',
            inclusive: true,
            message: 'Required - Notification Name',
          });
        }
      }),
    notificationGroupId: z
      .string({
        invalid_type_error: 'Required - Notification Group',
      })
      .superRefine((data, ctx) => {
        if (data.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.too_small,
            minimum: 1,
            type: 'string',
            inclusive: true,
            message: 'Required - Notification Group',
          });
        }
      }),
    steps: z
      .array(
        z
          .object({
            template: z
              .object({
                content: z.any(),
                subject: z.any(),
                title: z.any(),
                layoutId: z.any().optional(),
                senderName: z.any().optional(),
              })
              .passthrough()
              .superRefine((template: any, ctx) => {
                if (
                  (template.type === ChannelTypeEnum.SMS ||
                    template.type === ChannelTypeEnum.IN_APP ||
                    template.type === ChannelTypeEnum.PUSH ||
                    template.type === ChannelTypeEnum.CHAT) &&
                  template.content.length === 0
                ) {
                  ctx.addIssue({
                    code: z.ZodIssueCode.too_small,
                    minimum: 1,
                    type: 'string',
                    inclusive: true,
                    message: `Required - ${getChannel(template.type)?.label} Content`,
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
                      message: 'Required - Email Subject',
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
                    message: 'Required - Push Title',
                    path: ['title'],
                  });
                }
              }),
            metadata: z
              .object({
                amount: z.any().optional(),
                unit: z.string().optional(),
              })
              .passthrough()
              .optional(),
          })
          .passthrough()
          .superRefine((step: any, ctx) => {
            if (step.template.type !== StepTypeEnum.DIGEST && step.template.type !== StepTypeEnum.DELAY) {
              return;
            }

            if (step.metadata?.type === DelayTypeEnum.SCHEDULED) {
              if (!step.metadata?.delayPath) {
                ctx.addIssue({
                  code: z.ZodIssueCode.too_small,
                  minimum: 1,
                  type: 'string',
                  inclusive: true,
                  message: 'Required - Delay Path',
                  path: ['metadata', 'delayPath'],
                });
              }

              return;
            }

            let amount = parseInt(step.metadata?.amount, 10);
            let unit = step.metadata?.unit;

            if (!amount) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Required - ${getChannel(step.template.type)?.label} Amount`,
                path: ['metadata', 'amount'],
              });
            }
            if (!unit) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Required - ${getChannel(step.template.type)?.label} Unit`,
                path: ['metadata', 'unit'],
              });
            }

            if (unit === 'hours' && amount > 24) {
              ctx.addIssue({
                code: z.ZodIssueCode.too_big,
                maximum: 24,
                type: 'number',
                inclusive: true,
                message: 'Hours must be 24 or below',
                path: ['metadata', 'amount'],
              });
            }

            if (unit === 'days' && amount > 31) {
              ctx.addIssue({
                code: z.ZodIssueCode.too_big,
                maximum: 31,
                type: 'number',
                inclusive: true,
                message: 'Days must be 31 or below',
                path: ['metadata', 'amount'],
              });
            }

            if (step.metadata?.type !== DigestTypeEnum.BACKOFF) {
              return;
            }
            amount = step.metadata?.backoffAmount;
            unit = step.metadata?.backoffUnit;
            if (!unit) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Required - Backoff Unit',
                path: ['metadata', 'backoffUnit'],
              });
            }

            if (!amount) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Required - Backoff Amount',
                path: ['metadata', 'backoffAmount'],
              });
            }
          })
      )
      .optional(),
  })
  .passthrough();
