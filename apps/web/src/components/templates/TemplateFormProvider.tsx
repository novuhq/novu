import { FormProvider, useFieldArray, useForm } from 'react-hook-form';
import { FieldArrayProvider } from './FieldArrayProvider';
import { IForm } from './use-template-controller.hook';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ChannelTypeEnum, DigestTypeEnum, StepTypeEnum } from '@novu/shared';

const schema = z
  .object({
    name: z
      .string({
        required_error: 'Required - Notification Name',
      })
      .superRefine((data, ctx) => {
        if (data.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.too_small,
            minimum: 1,
            type: 'string',
            inclusive: true,
            message: 'Required - Notification Name',
            path: ['name'],
          });
        }
      }),
    notificationGroup: z
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
            path: ['notificationGroup'],
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
              })
              .passthrough()
              .superRefine((template: any, ctx) => {
                if (
                  (template.type === ChannelTypeEnum.SMS || template.type === ChannelTypeEnum.IN_APP) &&
                  template.content.length === 0
                ) {
                  ctx.addIssue({
                    code: z.ZodIssueCode.too_small,
                    minimum: 1,
                    type: 'string',
                    inclusive: true,
                    message: 'Required - Message Content',
                    path: ['content'],
                  });
                }
                if (template.type === ChannelTypeEnum.EMAIL && !template.subject) {
                  ctx.addIssue({
                    code: z.ZodIssueCode.too_small,
                    minimum: 1,
                    type: 'string',
                    inclusive: true,
                    message: 'Required - Email Subject',
                    path: ['subject'],
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
            if (step.template.type !== StepTypeEnum.DIGEST) {
              return;
            }

            let amount = parseInt(step.metadata?.amount, 10);
            let unit = step.metadata?.unit;

            if (unit === 'hours' && amount > 24) {
              ctx.addIssue({
                code: z.ZodIssueCode.too_big,
                maximum: 24,
                type: 'number',
                inclusive: true,
                message: 'Digest time amount must be 24 or below',
                path: ['metadata', 'amount'],
              });
            }

            if (unit === 'days' && amount > 31) {
              ctx.addIssue({
                code: z.ZodIssueCode.too_big,
                maximum: 31,
                type: 'number',
                inclusive: true,
                message: 'Digest time amount must be 31 or below',
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
                message: 'Digest backoff time is required',
                path: ['metadata', 'backoffUnit'],
              });
            }

            if (!amount) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Digest backoff time is required',
                path: ['metadata', 'backoffAmount'],
              });
            }
          })
      )
      .optional(),
  })
  .passthrough();

export const TemplateFormProvider = ({ children }) => {
  const methods = useForm<IForm>({
    resolver: zodResolver(schema),
  });

  const steps = useFieldArray({
    control: methods.control,
    name: 'steps',
  });

  return (
    <FormProvider {...methods}>
      <FieldArrayProvider fieldArrays={{ steps }}>{children}</FieldArrayProvider>
    </FormProvider>
  );
};
